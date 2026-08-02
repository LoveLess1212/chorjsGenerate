import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  Association,
  BaseElement,
  BPMNDiagram,
  BPMNEdge,
  BPMNShape,
  BpmnModdle,
  Choreography,
  ChoreographyTask,
  FlowNode,
  Message,
  MessageFlow,
  Participant,
  Point,
  SequenceFlow,
  TextAnnotation
} from 'bpmn-moddle';
import { layoutProcess } from 'bpmn-auto-layout';
import { ContractFlowAST, IContractToBpmnService, IBpmnGenerationOptions, ProcessStep } from '../internal-interface';
import { generateId } from '../helper';

type LayoutBounds = { x: number; y: number; width: number; height: number };
type LayoutPoint = { x: number; y: number };
type LayoutResult = {
  shapes: Map<string, LayoutBounds>;
  edges: Map<string, LayoutPoint[]>;
};

const ANNOTATION_WIDTH = 200;
const ANNOTATION_HEIGHT = 70;
const ANNOTATION_VERTICAL_OFFSET = 110;
const MIN_ANNOTATION_Y = 20;
const PARTICIPANT_BAND_HEIGHT = 20;
const TOP_PARTICIPANT_INDEX = 0;
const FIRST_NEXT_STEP_INDEX = 0;
const MIN_NEXT_STEPS_FOR_SUCCESS_FLOW = 0;
const CENTER_DIVISOR = 2;

export class ContractToBpmnService implements IContractToBpmnService {
  validateTranslation(ast: ContractFlowAST): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  private moddle = new BpmnModdle();
  async generateXML(ast: ContractFlowAST, options?: IBpmnGenerationOptions): Promise<string> {
    const flowElements: BaseElement[] = [];
    const participants: Participant[] = [];
    const messages: Message[] = [];
    const messageFlows: MessageFlow[] = [];
    const sequenceFlows: SequenceFlow[] = [];
    const visibleNodes: FlowNode[] = [];
    const annotations: TextAnnotation[] = [];
    const associations: Association[] = [];
    const participantByName = new Map<string, Participant>();
    const stepNodeByStep = new Map<ProcessStep, FlowNode>();
    const addFlow = (sourceRef: FlowNode, targetRef: FlowNode, name?: string) => {
      const flow = this.buildFlow(sourceRef, targetRef, name);

      sequenceFlows.push(flow);
      flowElements.push(flow);

      return flow;
    };

    // Generate participants dynamically
    ast.parties.forEach(party => {
      const participant = this.create('bpmn:Participant', { id: generateId('Participant'), name: party.name });
      participants.push(participant);
      participantByName.set(party.name, participant);
    });

    ast.steps.forEach(step => {
      const node = this.buildNodeForStep(
        step,
        generateId(this.getIdPrefixForStep(step)),
        participantByName,
        messages,
        messageFlows
      );

      stepNodeByStep.set(step, node);
    });

    ast.steps.forEach(step => {
      if (!step.annotation) {
        return;
      }

      const annotation = this.create('bpmn:TextAnnotation', {
        id: generateId('TextAnnotation'),
        text: step.annotation
      });
      const association = this.create('bpmn:Association', {
        id: generateId('Association'),
        sourceRef: this.resolveStepNode(step, stepNodeByStep),
        targetRef: annotation
      });

      annotations.push(annotation);
      associations.push(association);
      flowElements.push(annotation);
      flowElements.push(association);
    });

    // Iterate through the clean AST and generate semantic nodes
    ast.steps.forEach(step => {
      const node = this.resolveStepNode(step, stepNodeByStep);

      flowElements.push(node);
      visibleNodes.push(node);
      // Auto-generate Gateways & Flows for Fallbacks
      if (step.fallbackStep) {
        // Automatically inject the "meta-talk" gateway that the AST abstracted away
        const gatewayId = generateId('Gateway');
        const gateway = this.create('bpmn:ExclusiveGateway', {
          id: gatewayId,
          name: step.fallbackQuestion ?? `Evaluate ${step.name}?`
        });

        // Link Step -> Gateway
        addFlow(node, gateway);

        // Link Gateway -> Success (Yes)
        if (step.nextSteps.length > MIN_NEXT_STEPS_FOR_SUCCESS_FLOW) {
          addFlow(gateway, this.resolveStepNode(step.nextSteps[FIRST_NEXT_STEP_INDEX], stepNodeByStep), 'yes');
        }

        // Link Gateway -> Fallback (No)
        addFlow(gateway, this.resolveStepNode(step.fallbackStep, stepNodeByStep), 'no');

        flowElements.push(gateway);
        visibleNodes.push(gateway);
      } else {
        // Standard linear flow if no fallback exists
        step.nextSteps.forEach(nextStep => {
          addFlow(node, this.resolveStepNode(nextStep, stepNodeByStep));
        });
      }
    });

    // Wrap everything in the Choreography element
    const choreography = this.create('bpmn:Choreography', {
      id: generateId('Choreography'),
      participants,
      messageFlows,
      flowElements
    });

    const diagram = await this.buildAutoLayoutDiagram(choreography, visibleNodes, sequenceFlows, annotations, associations);

    // Assemble Root
    const definitions = this.create('bpmn:Definitions', {
      id: generateId('Definitions'),
      targetNamespace: 'http://bpmn.io/schema/bpmn',
      rootElements: [...messages, choreography],
      diagrams: [diagram]
    });

    const { xml } = await this.moddle.toXML(definitions, { format: true });

    await this.writeGeneratedFile(ast.name, xml);

    return xml;
  }

  // --- Helper Methods to reduce repetition ---

  private create<K extends keyof import('bpmn-moddle').ElementTypes>(
    type: K,
    attrs: Record<string, unknown> = {}
  ): import('bpmn-moddle').ElementTypes[K] {
    return this.moddle.create(type, attrs);
  }

  private buildFlow(sourceRef: FlowNode, targetRef: FlowNode, name?: string): SequenceFlow {
    const id = generateId('Flow');
    const flow = this.create('bpmn:SequenceFlow', { id, name, sourceRef, targetRef });

    sourceRef.outgoing = [...(sourceRef.outgoing ?? []), flow];
    targetRef.incoming = [...(targetRef.incoming ?? []), flow];

    return flow;
  }

  private async buildAutoLayoutDiagram(
    choreography: Choreography,
    visibleNodes: FlowNode[],
    sequenceFlows: SequenceFlow[],
    annotations: TextAnnotation[],
    associations: Association[]
  ): Promise<BPMNDiagram> {
    console.log('Applying auto-layout to BPMN diagram via mock process...');

    const layout = await this.layoutMockProcess(visibleNodes, sequenceFlows);

    return this.buildDiagramFromLayout(choreography, visibleNodes, sequenceFlows, annotations, associations, layout);
  }

  private async layoutMockProcess(visibleNodes: FlowNode[], sequenceFlows: SequenceFlow[]): Promise<LayoutResult> {
    const mockNodeById = new Map<string, FlowNode>();
    const mockFlowElements: BaseElement[] = [];

    visibleNodes.forEach(node => {
      const mockNode = this.createMockNode(node);

      mockNodeById.set(node.id, mockNode);
      mockFlowElements.push(mockNode);
    });

    sequenceFlows.forEach(flow => {
      const sourceRef = mockNodeById.get(flow.sourceRef.id);
      const targetRef = mockNodeById.get(flow.targetRef.id);

      if (!sourceRef || !targetRef) {
        return;
      }

      const mockFlow = this.create('bpmn:SequenceFlow', {
        id: flow.id,
        name: flow.name,
        sourceRef,
        targetRef
      });

      sourceRef.outgoing = [...(sourceRef.outgoing ?? []), mockFlow];
      targetRef.incoming = [...(targetRef.incoming ?? []), mockFlow];
      mockFlowElements.push(mockFlow);
    });

    const process = this.create('bpmn:Process', {
      id: generateId('MockProcess'),
      flowElements: mockFlowElements
    });
    const definitions = this.create('bpmn:Definitions', {
      id: generateId('MockDefinitions'),
      targetNamespace: 'http://bpmn.io/schema/bpmn',
      rootElements: [process]
    });
    const { xml: mockXml } = await this.moddle.toXML(definitions, { format: true });
    const layoutXml = await layoutProcess(mockXml);

    return this.extractLayout(layoutXml);
  }

  private createMockNode(node: FlowNode): FlowNode {
    switch (node.$type) {
      case 'bpmn:ChoreographyTask':
        return this.create('bpmn:Task', { id: node.id, name: node.name });
      case 'bpmn:ExclusiveGateway':
        return this.create('bpmn:ExclusiveGateway', { id: node.id, name: node.name });
      case 'bpmn:StartEvent':
        return this.create('bpmn:StartEvent', { id: node.id, name: node.name });
      case 'bpmn:EndEvent':
        return this.create('bpmn:EndEvent', { id: node.id, name: node.name });
      default:
        return this.create('bpmn:Task', { id: node.id, name: node.name });
    }
  }

  private async extractLayout(layoutXml: string): Promise<LayoutResult> {
    const { rootElement } = await this.moddle.fromXML(layoutXml);
    const root = rootElement as any;
    const shapes = new Map<string, LayoutBounds>();
    const edges = new Map<string, LayoutPoint[]>();

    root.diagrams?.forEach((diagram: any) => {
      diagram.plane?.planeElement?.forEach((element: any) => {
        const bpmnElementId = element.bpmnElement?.id;

        if (!bpmnElementId) {
          return;
        }

        if (element.$type === 'bpmndi:BPMNShape' && element.bounds) {
          shapes.set(bpmnElementId, {
            x: element.bounds.x,
            y: element.bounds.y,
            width: element.bounds.width,
            height: element.bounds.height
          });
        }

        if (element.$type === 'bpmndi:BPMNEdge' && element.waypoint) {
          edges.set(
            bpmnElementId,
            element.waypoint.map((point: any) => ({ x: point.x, y: point.y }))
          );
        }
      });
    });

    return { shapes, edges };
  }

  private buildDiagramFromLayout(
    choreography: Choreography,
    visibleNodes: FlowNode[],
    sequenceFlows: SequenceFlow[],
    annotations: TextAnnotation[],
    associations: Association[],
    layout: LayoutResult
  ): BPMNDiagram {
    const planeElements: (BPMNShape | BPMNEdge)[] = [];
    const shapeByElement = new Map<BaseElement, BPMNShape>();

    visibleNodes.forEach(node => {
      const layoutBounds = layout.shapes.get(node.id);

      if (!layoutBounds) {
        throw new Error(`Auto-layout did not return bounds for ${node.id}`);
      }

      const shape = this.createShape(node, layoutBounds);

      shapeByElement.set(node, shape);
      planeElements.push(shape);
      planeElements.push(...this.createParticipantBandShapes(node, shape));
    });

    annotations.forEach(annotation => {
      const association = associations.find(association => association.targetRef === annotation);
      const sourceShape = association ? shapeByElement.get(association.sourceRef) : undefined;

      if (!sourceShape) {
        throw new Error(`Unable to place annotation ${annotation.id} without a laid-out source shape`);
      }

      const bounds: LayoutBounds = {
        x: sourceShape.bounds.x,
        y: sourceShape.bounds.y + ANNOTATION_VERTICAL_OFFSET,
        width: ANNOTATION_WIDTH,
        height: ANNOTATION_HEIGHT
      };
      const shape = this.create('bpmndi:BPMNShape', {
        id: generateId('BPMNShape'),
        bpmnElement: annotation,
        bounds: this.create('dc:Bounds', bounds)
      });

      shapeByElement.set(annotation, shape);
      planeElements.push(shape);
    });

    sequenceFlows.forEach(flow => {
      const sourceShape = shapeByElement.get(flow.sourceRef);
      const targetShape = shapeByElement.get(flow.targetRef);

      if (!sourceShape || !targetShape) {
        return;
      }

      const layoutWaypoints = layout.edges.get(flow.id);

      if (!layoutWaypoints) {
        throw new Error(`Auto-layout did not return waypoints for ${flow.id}`);
      }

      planeElements.push(this.createEdge(flow, sourceShape, targetShape, layoutWaypoints));
    });

    associations.forEach(association => {
      const sourceShape = shapeByElement.get(association.sourceRef);
      const targetShape = shapeByElement.get(association.targetRef);

      if (!sourceShape || !targetShape) {
        return;
      }

      planeElements.push(this.createEdge(association, sourceShape, targetShape));
    });

    const plane = this.create('bpmndi:BPMNPlane', {
      id: generateId('BPMNPlane'),
      bpmnElement: choreography,
      planeElement: planeElements
    });

    return this.create('bpmndi:BPMNDiagram', {
      id: generateId('BPMNDiagram'),
      plane
    });
  }

  private createShape(element: FlowNode, layoutBounds: LayoutBounds): BPMNShape {
    const isGateway = element.$type === 'bpmn:ExclusiveGateway';

    return this.create('bpmndi:BPMNShape', {
      id: generateId('BPMNShape'),
      bpmnElement: element,
      isMarkerVisible: isGateway || undefined,
      bounds: this.create('dc:Bounds', layoutBounds)
    });
  }

  private createParticipantBandShapes(element: FlowNode, taskShape: BPMNShape): BPMNShape[] {
    if (element.$type !== 'bpmn:ChoreographyTask') {
      return [];
    }

    const task = element as ChoreographyTask;
    const participants = task.participantRef ?? [];

    return participants.map((participant, index) => {
      const isInitiating = participant === task.initiatingParticipantRef;
      const isTopBand = index === TOP_PARTICIPANT_INDEX;

      return this.create('bpmndi:BPMNShape', {
        id: generateId('BPMNShape'),
        bpmnElement: participant,
        isMessageVisible: false,
        participantBandKind: isTopBand
          ? isInitiating ? 'top_initiating' : 'top_non_initiating'
          : isInitiating ? 'bottom_initiating' : 'bottom_non_initiating',
        choreographyActivityShape: taskShape,
        bounds: this.create('dc:Bounds', {
          x: taskShape.bounds.x,
          y: isTopBand ? taskShape.bounds.y : taskShape.bounds.y + taskShape.bounds.height - PARTICIPANT_BAND_HEIGHT,
          width: taskShape.bounds.width,
          height: PARTICIPANT_BAND_HEIGHT
        })
      });
    });
  }

  private createEdge(
    element: BaseElement,
    sourceShape: BPMNShape,
    targetShape: BPMNShape,
    layoutWaypoints?: LayoutPoint[]
  ): BPMNEdge {
    return this.create('bpmndi:BPMNEdge', {
      id: generateId('BPMNEdge'),
      bpmnElement: element,
      waypoint: layoutWaypoints?.map(point => this.create('dc:Point', point)) ?? [
        this.centerPoint(sourceShape),
        this.centerPoint(targetShape)
      ]
    });
  }

  private centerPoint(shape: BPMNShape): Point {
    return this.create('dc:Point', {
      x: shape.bounds.x + shape.bounds.width / CENTER_DIVISOR,
      y: shape.bounds.y + shape.bounds.height / CENTER_DIVISOR
    });
  }

  private buildNodeForStep(
    step: ProcessStep,
    id: string,
    participantByName: Map<string, Participant>,
    messages: Message[],
    messageFlows: MessageFlow[]
  ): FlowNode {
    if (step.kind === 'task') {
      const initiatingParticipant = step.initiatorName ? participantByName.get(step.initiatorName) : undefined;
      const recipientParticipant = step.recipientName ? participantByName.get(step.recipientName) : undefined;
      const message = this.create('bpmn:Message', { id: generateId('Message') });
      const messageFlow = this.create('bpmn:MessageFlow', {
        id: generateId('MessageFlow'),
        sourceRef: initiatingParticipant,
        targetRef: recipientParticipant,
        messageRef: message
      });

      messages.push(message);
      messageFlows.push(messageFlow);

      return this.create('bpmn:ChoreographyTask', {
        id,
        name: step.name,
        // Map participant strings back to generated object refs
        initiatingParticipantRef: initiatingParticipant,
        participantRef: [initiatingParticipant, recipientParticipant].filter(Boolean),
        messageFlowRef: [messageFlow]
      });
    }

    switch (step.event) {
      case 'Fulfill':
        const termDef = this.create('bpmn:TerminateEventDefinition', { id: generateId('TerminateEventDefinition') });
        return this.create('bpmn:EndEvent', { id, name: step.name, eventDefinitions: [termDef] });
      case 'Breach':
        return this.create('bpmn:EndEvent', { id, name: step.name });
      default:
        // Handle trigger start event
        const condition = this.create('bpmn:FormalExpression');
        const eventDefinition = this.create('bpmn:ConditionalEventDefinition', {
          id: generateId('ConditionalEventDefinition'),
          condition
        });

        return this.create('bpmn:StartEvent', { id, name: step.name, eventDefinitions: [eventDefinition] });
    }
  }

  private getIdPrefixForStep(step: ProcessStep): string {
    if (step.kind === 'task') {
      return 'ChoreographyTask';
    }

    return 'Event';
  }

  private async writeGeneratedFile(name: string, xml: string): Promise<void> {
    const outputDirectory = path.join('resource', this.formatDateFolder(new Date()));
    const outputPath = path.join(outputDirectory, `${this.toFileName(name)}.bpmn`);

    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(outputPath, xml, 'utf8');
  }

  private formatDateFolder(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());

    return `${day}${month}${year}`;
  }

  private toFileName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'contract-flow';
  }

  private resolveStepNode(step: ProcessStep, stepNodeByStep: Map<ProcessStep, FlowNode>): FlowNode {
    const node = stepNodeByStep.get(step);

    if (!node) {
      throw new Error(`Unable to resolve BPMN node for step: ${step.name}`);
    }

    return node;
  }
}
