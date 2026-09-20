import { ContractToBpmnService } from './services/generate';
import { ContractFlowInput, createContractFlowAST, StartEventStepInput } from './interface';
import { generateDeonticLogic } from './services/deontic';

const hotelCompensationInput: ContractFlowInput = {
  name: 'Hotel compensation flow',
  parties: [
    { name: 'Jade Hotel' },
    { name: 'Customer' }
  ],
  steps: [
    {
      id: 'start-no-seaview-room',
      kind: 'event',
      event: 'Start',
      name: 'Hotel has no seaview room for customer booking the deluxe room',
      annotation: '≡ ∃ro ∈ Jade, t ∈ Tourist : booked(t, ro) ∧ BalconyWithSeaView(ro)',
      nextStepIds: ['provide-alternative-room']
    },
    {
      id: 'provide-alternative-room',
      kind: 'task',
      name: 'Provide Alternative room',
      initiatorName: 'Jade Hotel',
      recipientName: 'Customer',
      annotation: '≡ ∃ar ∈ Jade, t ∈ Tourist : (LuxuryInterior(ar) ∨ KingSizeDoubleBed(ar)) ∧ CheckIn(t, ar)',
      nextStepIds: ['fulfilled-by-room'],
      fallbackStepId: 'provide-free-spa-access',
      fallbackQuestion: 'Does alternative room available ?'
    },
    {
      id: 'provide-free-spa-access',
      kind: 'task',
      name: 'Provide free spa access',
      initiatorName: 'Jade Hotel',
      recipientName: 'Customer',
      annotation: '≡ ∃spa ∈ Service, ar ∈ Jade, t ∈ Tourist : FreeAccess(ar, spa) ∧ CheckIn(t, ar)',
      nextStepIds: ['fulfilled-by-spa'],
      fallbackStepId: 'provide-discount',
      fallbackQuestion: 'Does free spa access available ?'
    },
    {
      id: 'provide-discount',
      kind: 'task',
      name: 'Provide 50% discount on checkout',
      initiatorName: 'Jade Hotel',
      recipientName: 'Customer',
      annotation: '≡ ∃ro ∈ Jade, t ∈ Tourist, spa ∈ Service : booked(t, ro) ∧ CheckOut(t, ro) ∧ Discount50Percent(t, ro)',
      nextStepIds: ['fulfilled-by-discount'],
      fallbackStepId: 'breached-customer-uncompensated',
      fallbackQuestion: 'Does the discount available ?'
    },
    {
      id: 'fulfilled-by-room',
      kind: 'event',
      event: 'Fulfill',
      name: 'Contract fulfilled'
    },
    {
      id: 'fulfilled-by-spa',
      kind: 'event',
      event: 'Fulfill',
      name: 'Contract fulfilled'
    },
    {
      id: 'fulfilled-by-discount',
      kind: 'event',
      event: 'Fulfill',
      name: 'Contract fulfilled'
    },
    {
      id: 'breached-customer-uncompensated',
      kind: 'event',
      event: 'Breach',
      name: 'Contract unfulfilled, customer is uncompensated'
    }
  ]
};

async function generateDiagram() {
  const service = new ContractToBpmnService();
  const ast = createContractFlowAST(hotelCompensationInput);
  await service.generateXML(ast, { applyAutoLayout: true });

  console.log(
    generateDeonticLogic(ast.steps[0] as StartEventStepInput)
  );

  // console.log(xml);
}

generateDiagram().catch(console.error);