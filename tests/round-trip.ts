import { strict as assert } from 'node:assert';
import { ContractFlowInput, ContractToBpmnService, createContractFlowAST } from '..';

const input: ContractFlowInput = {
  name: 'Round trip contract',
  parties: [
    { name: 'Provider' },
    { name: 'Customer' }
  ],
  steps: [
    {
      id: 'start',
      kind: 'event',
      event: 'Start',
      name: 'Service is requested',
      nextStepIds: ['provide-service']
    },
    {
      id: 'provide-service',
      kind: 'task',
      name: 'Provide service',
      initiatorName: 'Provider',
      recipientName: 'Customer',
      annotation: 'service(provided)',
      nextStepIds: ['fulfilled'],
      fallbackStepId: 'breached',
      fallbackQuestion: 'Was the service available?'
    },
    {
      id: 'fulfilled',
      kind: 'event',
      event: 'Fulfill',
      name: 'Contract fulfilled'
    },
    {
      id: 'breached',
      kind: 'event',
      event: 'Breach',
      name: 'Contract breached'
    }
  ]
};

async function testRoundTrip(): Promise<void> {
  const service = new ContractToBpmnService();
  const original = createContractFlowAST(input);
  const xml = await service.generateXML(original);
  const parsed = await service.parseXML(xml);

  assert.equal(parsed.name, original.name);
  assert.deepEqual(parsed.parties, original.parties);
  assert.equal(parsed.steps.length, input.steps.length);
  assert.ok(parsed.steps.every(step => /^(Event|ChoreographyTask)/.test(step.id)));

  const task = parsed.steps.find(step => step.name === 'Provide service');
  assert.ok(task);
  assert.equal(task.annotation, 'service(provided)');
  assert.equal(task.initiatorName, 'Provider');
  assert.equal(task.recipientName, 'Customer');
  assert.equal(task.nextSteps[0]?.name, 'Contract fulfilled');
  assert.equal(task.fallbackStep?.name, 'Contract breached');
  assert.equal(task.fallbackQuestion, 'Was the service available?');

  console.log('BPMN round-trip test passed');
}

testRoundTrip().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
