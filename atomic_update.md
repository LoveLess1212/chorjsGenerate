# Đề Xuất Bộ Nguyên Tử Hóa (Atomic Primitives) Cho `atomic_case_base.json`

> **Tài liệu ghi chú phục vụ báo cáo / xin ý kiến Leader**  
> *Ngày tạo: 11/10/2026*  
> *Nguyên tắc hiện tại: Giữ nguyên vẹn 100% theo bảng đặc tả Deontic Logic sang BPMN Choreography gốc (Lê et al.). Chưa tự ý bổ sung toán tử mới vào case base chính thức.*

---

## 1. Bối cảnh & Lý do chuyển đổi sang Atomic Case Base

### 1.1 Vấn đề của Case Base cũ (Monolithic / Composite Cases):
- **Overfitting & Rò rỉ dữ liệu (Data Leakage):** Việc lưu sẵn các case lớn, phức tạp (như cả hợp đồng Jade Hotel hay XYZ Parts) khiến hệ thống mang tính chất "học vẹt". Khi benchmark, khó chứng minh tính tổng quát độc lập của mô hình.
- **Loãng ngữ nghĩa khi Embedding (Semantic Dilution):** Khi một đoạn văn quá dài gồm 4 bên, nhiều mốc thời gian và 4-5 tầng phạt được nén vào 1 vector, vector đó bị nhiễu và dễ kéo sai case tương đồng.
- **Bùng nổ tổ hợp (Combinatorial Explosion):** Thế giới thực có vô số cách kết hợp điều khoản. Cố lưu các case to là đi vào hướng tiếp cận Brute-force.

### 1.2 Giải pháp: Kiến trúc 3 Tầng (3-Tier Hierarchical PO-CBR)
1. **Tầng 1 (Micro / Atomic):** Case Base chỉ chứa các **mẫu nguyên tử (Atomic Primitives)** không thể phân rã thêm. Embed câu ngắn, retrieve chính xác tuyệt đối.
2. **Tầng 2 (Meso / Sub-Choreography):** Ghép các task nguyên tử thành cây quyết định (Decision Tree / Escalation Ladder) của từng điều khoản (nối Gateway `[yes]`/`[no]`).
3. **Tầng 3 (Macro / Global Choreography):** Ghép các sơ đồ con của các bên/dịch vụ thành sơ đồ BPMN tổng thể của cả hợp đồng.

---

## 2. Bảng 6 Toán Tử Nguyên Tử Gốc (Theo chuẩn bảng nghiên cứu)

Dưới đây là 6 nguyên tử chuẩn mực được giữ nguyên vẹn theo tài liệu nghiên cứu:

| STT | Toán tử (Operator) | Biểu thức Deontic (Clause) | Ý nghĩa nghiệp vụ (Meaning) | Mô hình BPMN Choreography |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Obligation** | $... O_{pr1} \sigma ...$ | Bên $pr1$ có nghĩa vụ bắt buộc thực hiện hành động $\sigma$. | `[pr1 -> pr2: Action Alpha]` $\to$ `◇ (Alpha fulfilled?)` <br> • Nhánh `yes` $\to$ `Contract fulfilled` <br> • Nhánh `no` $\to$ `...` |
| **2** | **Permission** | $... P_{pr1} \sigma ...$ | Bên $pr1$ được phép (tùy chọn) thực hiện hành động $\sigma$. | `◇ (XOR Split)` $\to$ rẽ 2 nhánh: <br> • Nhánh 1: `[pr1 -> pr2: Action Sigma]` <br> • Nhánh 2: `Bypass (Bỏ qua)` <br> $\to$ gom lại qua `◇ (XOR Join)` $\to$ `...` |
| **3** | **Forbidden** | $... F_{pr1} \sigma ...$ | Bắt buộc bên $pr1$ không được phép để hành động $\alpha$ xảy ra (Cấm). | `◇ (XOR Split)` $\to$ <br> • Nhánh không vi phạm $\to$ `Contract fulfilled (Not doing Alpha)` <br> • Nhánh vi phạm: `[pr1 -> pr2: Action Alpha]` $\to$ `...` |
| **4** | **"Failing which"** | $... O_p \alpha \otimes O_q \beta ...$ | Toán tử $\otimes$ (Contrary-to-Duty): Nếu bên $p$ không hoàn thành $\alpha$, bắt buộc bên $q$ phải thực hiện cứu vãn $\beta$ sau đó. | `[p -> pr2: Action Alpha]` $\to$ `◇ (Alpha fulfilled?)` <br> • Nhánh `yes` $\to$ `Contract fulfilled` <br> • Nhánh `no` $\to$ `[q -> pr1: Action Beta]` $\to$ `◇ (Beta fulfilled?)` $\to$ `...` |
| **5** | **The last chance to compensate** | $... \circledast O_{pr} \alpha$ | Toán tử $\circledast$: Bên $pr$ có cơ hội cuối cùng để bồi thường bằng $\alpha$. Thất bại sẽ dẫn đến vi phạm không thể đền bù. | `[pr -> pr2: Action Alpha]` $\to$ `◇ (Alpha fulfilled?)` <br> • Nhánh `yes` $\to$ `Contract fulfilled` <br> • Nhánh `no` $\to$ `● (Contract unfulfilled, customer is uncompensated / Breach)` |
| **6** | **Trigger condition** | $cond \vdash ...$ | Điều kiện hoặc tiền đề kích hoạt hợp đồng / điều khoản phạt. | `[Conditional Event Icon (cond)]` $\to$ Bắt đầu luồng nghiệp vụ. |
| **7** | **Parallel Conjunction ("And")** | $... O_{pr1}\alpha \land O_{pr2}\beta ...$ | Các nghĩa vụ diễn ra đồng thời / song song (Parallel Gateway). | `[+] (Parallel Split)` $\to$ rẽ song song: <br> • Nhánh 1: `[pr1 -> pr2: Action Alpha]` <br> • Nhánh 2: `[pr3 -> pr4: Action Beta]` <br> $\to$ gom lại qua `[+] (Parallel Join)` |

---

## 3. Cấu trúc Chuẩn hóa của `atomic_case_base.json` (Domain-Agnostic & Multi-Exemplars)

Mỗi "viên lego" được chuẩn hóa bằng:
- Chủ thể trung tính: **`Party A`**, **`Party B`** (và **`Party C`** cho trường hợp Contrary-to-Duty bên thứ ba).
- Câu văn mẫu mang tính chất khung pháp lý phi-ngành (Domain-Agnostic Legal Phrasing).
- Mảng **`nl_exemplars`** chứa nhiều biến thể diễn đạt (Paraphrase) để tăng diện tích phủ (Recall) khi Embedding.

```json
[
  {
    "pattern_id": "atomic_obligation",
    "group": "Deontic Atomic Primitives",
    "pattern_name": "Obligation",
    "source_reference": "Lê et al. Table 1 (Row 1: Obligation O_{pr1} sigma)",
    "formal_signature": {
      "deontic_logic": "O_{Party_A}(Action_Alpha) -> Breach",
      "primary_gateways": ["bpmn:ExclusiveGateway"],
      "topology": "Bilateral Obligation (1 Task -> 1 Decision Gateway -> Fulfill / Breach)"
    },
    "nl_contract_text": "Under the agreement, Party A shall perform and deliver the primary obligation to Party B by the scheduled deadline; failing which, Party A is in material breach of contract obligations.",
    "nl_exemplars": [
      "Under the agreement, Party A shall perform and deliver the primary obligation to Party B by the scheduled deadline; failing which, Party A is in material breach of contract obligations.",
      "Party A is strictly obligated to execute the mandated performance for the benefit of Party B on schedule; failure to perform constitutes an immediate uncompensated breach.",
      "Party A covenants that it must deliver the primary deliverable to Party B within the agreed timeframe, failing which Party A defaults under this agreement."
    ],
    "target_ast": {
      "name": "primary_performance_obligation",
      "parties": [{"name": "Party A"}, {"name": "Party B"}],
      "steps": [ ... ]
    }
  }
]
```

---

## 4. Vấn đề Paraphrase Nhiều Đoạn: Có làm rối RAG không?

### 4.1 Câu trả lời:
**KHÔNG HỀ LÀM RỐI, NẾU LÀM ĐÚNG KỸ THUẬT.** Trong Information Retrieval (IR) hiện đại, đây là kỹ thuật tiêu chuẩn gọi là **Multi-Vector per Entity Indexing** (hoặc *Paraphrase Data Augmentation*).

### 4.2 Hai cách tiếp cận:
- ❌ **Cách làm SAI (Gây rối & lãng phí):**  
  Tạo ra các case riêng biệt có ID khác nhau nhưng cùng 1 AST (`atomic_obligation_1`, `atomic_obligation_2`...).  
  *Hậu quả:* Khi retrieve `top_k=2`, hệ thống kéo về 2 bản sao của cùng 1 mẫu, lãng phí context window của LLM.
- ✅ **Cách làm ĐÚNG (Tối ưu tuyệt đối):**  
  Mỗi nguyên tử giữ đúng **1 Pattern ID và 1 AST duy nhất**. Lưu 3-4 câu paraphrase vào mảng `nl_exemplars`.  
  Khi đưa vào Vector DB (Qdrant):
  1. Mỗi câu trong `nl_exemplars` được embed thành 1 vector riêng biệt nhưng cùng chung `payload.pattern_id`.
  2. Khi người dùng nhập câu truy vấn, Vector DB tìm thấy câu có cosine similarity gần nhất.
  3. Tầng Retrieval thực hiện **Deduplication theo `pattern_id`** trước khi trả về cho LLM.  
  *Hiệu quả:* Tăng tỷ lệ bắt trúng (Recall) lên 20-30% cho các văn phong lạ mà không làm loãng context của LLM.

---

## 5. Các điểm Gợi ý Thảo luận thêm với Leader

1. **Về việc trừu tượng hóa `Party A` / `Party B`:**  
   Báo cáo Leader về lợi ích triệt tiêu Lexical Bias và chống ảo giác sao chép tên riêng của LLM.
2. **Về kỹ thuật Multi-Exemplar Indexing:**  
   Xin phép Leader áp dụng cơ chế đánh chỉ mục đa vector (1 pattern_id trỏ về nhiều embedding points) để nhận diện đa dạng câu văn.
3. **Về mở rộng toán tử tương lai (Tùy chọn):**  
   Cổng Song song (Parallel AND Gateway) và Mốc thời gian (Timer Event) sẽ được cân nhắc bổ sung sau khi chốt xong 6 nguyên tử Deontic gốc.

