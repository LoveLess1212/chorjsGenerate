import {
  Stage2Interaction,
  FinalAtomicInteraction,
  CompiledSubFlow,
  Stage1Flow,
  DeonticOperator
} from "./schemas";

export function compileFlowInteractions(
  flowIndex: number,
  rawSteps: Stage2Interaction[]
): FinalAtomicInteraction[] {
  // 1. Tạo step_id chuẩn kebab-case cho toàn bộ các bước trước
  const stepsWithIds = rawSteps.map((step, idx) => {
    const slug = step.action
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const suffix = String.fromCharCode(97 + idx); // a, b, c...
    return {
      ...step,
      step_id: `step-${flowIndex + 1}${suffix}-${slug}`,
    };
  });

  // 2. Biên dịch con trỏ đồ thị (success_target_id & fallback_target_id) và kiểm tra bất biến
  return stepsWithIds.map((step, idx) => {
    const nextStep = stepsWithIds[idx + 1] ?? null;
    const isLastStep = idx === stepsWithIds.length - 1;

    let operator: DeonticOperator = step.deontic_operator;
    let successTargetId: string | null = null;
    let fallbackTargetId: string | null = null;

    // BẤT BIẾN 1: Bước đầu tiên của mỗi flow bắt buộc là "obligation" (trừ khi là forbidden/permission độc lập)
    if (idx === 0 && (operator === "contrary_to_duty" || operator === "last_chance")) {
      operator = "obligation";
    }

    // BẤT BIẾN 2: Bước khắc phục nằm ở giữa chuỗi (phía sau vẫn còn một bước phạt nữa)
    // thì bắt buộc phải là "contrary_to_duty", không được là "last_chance"
    if (
      !isLastStep &&
      operator === "last_chance" &&
      (nextStep?.deontic_operator === "contrary_to_duty" ||
        nextStep?.deontic_operator === "last_chance")
    ) {
      operator = "contrary_to_duty";
    }

    // BẤT BIẾN 3: Bước khắc phục nằm ở cuối chuỗi bắt buộc phải là "last_chance"
    if (
      isLastStep &&
      idx > 0 &&
      (operator === "contrary_to_duty" || operator === "last_chance")
    ) {
      operator = "last_chance";
    }

    // XỬ LÝ CON TRỎ CHUYỂN TIẾP (POINTER WIRING)
    if (operator === "permission" || step.flow_transition === "OPTIONAL_NO_FALLBACK") {
      // Permission là nhánh tùy chọn, không gây breach nếu bỏ qua
      successTargetId =
        nextStep?.deontic_operator === "obligation" ? nextStep.step_id : null;
      fallbackTargetId = null;
    } else if (
      operator === "obligation" &&
      nextStep?.deontic_operator === "obligation"
    ) {
      // BẤT BIẾN 4: Hai nghĩa vụ chính nối tiếp nhau (Happy-path sequence).
      // Thành công thì đi tiếp sang obligation kế tiếp.
      // Thất bại thì rơi xuống bước remedy/phạt đầu tiên (nếu có).
      successTargetId = nextStep.step_id;
      const firstRemedy = stepsWithIds
        .slice(idx + 1)
        .find(
          (s) =>
            s.deontic_operator === "contrary_to_duty" ||
            s.deontic_operator === "last_chance"
        );
      fallbackTargetId = firstRemedy ? firstRemedy.step_id : "terminal_breach";
    } else if (step.flow_transition === "ADVANCE_TO_NEXT_DUTY" && nextStep) {
      successTargetId = nextStep.step_id;
      const firstRemedy = stepsWithIds
        .slice(idx + 1)
        .find(
          (s) =>
            s.deontic_operator === "contrary_to_duty" ||
            s.deontic_operator === "last_chance"
        );
      fallbackTargetId = firstRemedy ? firstRemedy.step_id : "terminal_breach";
    } else if (step.flow_transition === "CURE_AND_RESUME_DUTY") {
      // Sửa lỗi xong thì quay lại nghĩa vụ tiếp theo (nếu có)
      const nextDuty = stepsWithIds
        .slice(idx + 1)
        .find((s) => s.deontic_operator === "obligation");
      successTargetId = nextDuty ? nextDuty.step_id : null;
      fallbackTargetId = nextStep ? nextStep.step_id : "terminal_breach";
    } else {
      // Chuỗi leo thang tiêu chuẩn: Obligation -> Contrary_to_Duty -> Last_Chance -> terminal_breach
      successTargetId = null;
      fallbackTargetId = nextStep ? nextStep.step_id : "terminal_breach";
    }

    return {
      step_id: step.step_id,
      deontic_operator: operator,
      initiator: step.initiator,
      recipient: step.recipient,
      action: step.action,
      trigger_condition: step.trigger_condition,
      success_target_id: successTargetId,
      fallback_target_id: fallbackTargetId,
      text_excerpt: step.text_excerpt,
    };
  });
}

export function compileSubFlow(
  flowIndex: number,
  flowMeta: Stage1Flow,
  rawSteps: Stage2Interaction[]
): CompiledSubFlow {
  const interactions = compileFlowInteractions(flowIndex, rawSteps);
  return {
    flow_id: flowMeta.flow_id,
    service_name: flowMeta.service_name,
    parties: flowMeta.parties,
    interactions
  };
}
