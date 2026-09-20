import { ProcessStep, StartEventStepInput } from '../internal-interface';
/*
 */
function sanitizeLatex(str: string): string {
  return str.replace(/[ _$%\&#{}^~\\]/g, '');
} 
export function generateDeonticLogic(startEvent: StartEventStepInput): string {
  return sanitizeLatex(generate(startEvent));
}
function generate(startEvent: StartEventStepInput): string {
  let latexString = `$r: \\neg \\textit{${startEvent.name}} \\vdash `;
  
  const obligations: string[] = [];
  const visitedSteps = new Set<ProcessStep>();

  function traverseSteps(steps: ProcessStep[] = []) {
    for (const step of steps) {
      if (visitedSteps.has(step)) {
        continue;
      }
      visitedSteps.add(step);

      if (step.kind === 'task') {
        obligations.push(`O_\\textit{${step.initiatorName}} \\textit{${step.name}}`);
      }

      traverseSteps(step.nextSteps);
      if (step.fallbackStep) {
        traverseSteps([step.fallbackStep]);
      }
    }
  }

  if (startEvent.nextSteps) {
    traverseSteps(startEvent.nextSteps);
  }

  latexString += obligations.join(' \\ \\circledast \\ ');
  latexString += '$';

  return latexString;
}