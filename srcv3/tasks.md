# Kế Hoạch Triển Khai Pipeline srcv3 (The Gold-Standard Pipeline)

Tài liệu quản lý tiến độ thực hiện nâng cấp pipeline bóc tách và sinh BPMN Choreography trong `chorag/srcv3`, dựa trên đề xuất kiến trúc từ `strong_model.md`.

---

## 📌 Tổng Quan Kiến Trúc srcv3
* **Stage 1 (LLM - Decomposer & Implicit Duty Reconstructor):** Phân rã luồng song song + Bóc tách các câu phức/ẩn thành danh sách mệnh đề phẳng (`PRIMARY_DUTY`, `REMEDY_OR_PENALTY`, `OPTIONAL_RIGHT`, `PROHIBITION`).
* **Stage 2 (LLM - Atomic Deontic Mapper):** Ánh xạ từng mệnh đề sang 5 toán tử hành vi và 5 enum chuyển tiếp `flow_transition` (loại bỏ hoàn toàn ký hiệu toán học nhiễu, không bắt LLM đoán ID).
* **Stage 3 (TypeScript Compiler):** Tự động sinh `step_id`, nối `success_target_id` / `fallback_target_id` tất định theo thuật toán và 4 bất biến logic.
* **Scaffolding & XML Generator:** Giữ nguyên vẹn tương thích với `json_xml` (`ContractToBpmnService`) để xuất BPMN 2.0 XML.

---

## 📋 Danh Sách Nhiệm Vụ (Task List)

### Phase 1: Foundation & Schemas
- [x] **Task 1.1: Tạo Zod Schemas (`srcv3/schemas.ts`)**
  - Xây dựng `Stage1DecompositionSchema` với cấu trúc `normative_clauses`.
  - Xây dựng `Stage2DeonticMappingSchema` với 5 `DeonticOperator` và 5 `FlowTransition`.
  - Export types suy luận (`Stage1Decomposition`, `Stage2Interaction`, `FinalAtomicInteraction`).
- [x] **Task 1.2: Chuẩn hóa Prompts (`srcv3/prompts.ts`)**
  - Đưa `STAGE_1_DECOMPOSITION_PROMPT` vào (lược bỏ toán học, nhấn mạnh quy tắc phục dựng nghĩa vụ ẩn).
  - Đưa `STAGE_2_DEONTIC_MAPPING_PROMPT` vào (5 định nghĩa toán tử rõ ràng + quy tắc trích xuất `trigger_condition`).
- [x] **Task 1.3: Cài đặt Graph Compiler (`srcv3/compiler.ts`)**
  - Viết hàm `compileFlowInteractions(flowIndex, rawSteps)`.
  - Cài đặt 4 Bất biến (Invariant 1: Bước đầu là obligation; Invariant 2: Giữa chuỗi là contrary_to_duty; Invariant 3: Cuối chuỗi là last_chance; Invariant 4: Hai obligation nối tiếp là Happy Path).
  - Cài đặt logic nối dây `success_target_id` và `fallback_target_id` dựa trên `flow_transition`.

### Phase 2: Pipeline Orchestration & Scaffolding
- [x] **Task 2.1: Xây dựng Pipeline Điều phối (`srcv3/pipeline.ts`)**
  - Hàm `runContractPipeline(contractText)` kết nối Stage 1 -> Stage 2 -> Stage 3.
  - Hỗ trợ xử lý song song các flow ở Stage 2 bằng `Promise.all`.
  - Đóng gói output thành `SubFlow[]` tương thích ngược với hệ thống scaffolding hiện tại.
- [x] **Task 2.2: Tinh chỉnh Scaffolding (`srcv3/scaffolding.ts`)**
  - Cập nhật `buildScaffolding` để tôn trọng `success_target_id` (hỗ trợ cả luồng thuận nối tiếp `ADVANCE_TO_NEXT_DUTY` và khôi phục `CURE_AND_RESUME_DUTY`).
  - Tự động sinh câu hỏi Gateway kiểm định theo mẫu chuẩn nếu không cần infill phức tạp.

### Phase 3: Thực thi & Kiểm thử Benchmark Cases (`srcv3/main.ts`)
- [x] **Task 3.1: Kiểm thử Case Jade Hotel (Single Flow, 4 Bậc chế tài)**
  - Đã chạy thành công: Phục dựng chuẩn xác phòng view biển và chuỗi 4 bước (Đổi phòng -> Vé Spa -> Giảm 50% -> Breach).
- [x] **Task 3.2: Kiểm thử Case Whale Watching (Single Flow, 3 Bậc chế tài)**
  - Đã chạy thành công: Tổ chức tour -> Cung cấp đồ uống -> Tặng voucher tour 2 -> Đền $100 -> Hoàn 50% tiền mặt -> Breach.
- [x] **Task 3.3: Kiểm thử Case Wedding Listing 9 (Multi Flow, 3 Nhà cung cấp song song)**
  - Đã chạy thành công: Tách chuẩn 3 flows (Vendor A, Vendor B, Vendor C), mỗi vendor chạy song song và ra chuẩn chuỗi 3 bậc chế tài.

### Phase 4: Sinh BPMN XML & Nghiệm thu
- [x] **Task 4.1: Chạy `ContractToBpmnService` sinh BPMN 2.0 XML**
  - Sinh XML tự động thành công cho cả 3 contracts (Jade Hotel, Whale Watching, Wedding Listing 9).
  - Lưu file XML vào `srcv3/resource/`.
- [ ] **Task 4.2: Đánh giá chất lượng sơ đồ**
  - Kiểm tra tính hợp lệ của BPMN XML (StartEvent, ChoreographyTask, ExclusiveGateway, EndEvent).
  - So sánh đồ thị trực quan với sơ đồ chuẩn.
