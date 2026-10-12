# HSK3 Mini App — bản clone

Bản phát triển từ `HSK3_MiniApp_Billie (1).html`, với giao diện lấy cảm hứng từ Liquid Glass trên iPhone. Giữ bộ dữ liệu 20 bài học và mở rộng phần luyện tập. Tệp gốc được giữ riêng ngoài repository.

**Dùng ngay:** [Tải HSK3-MiniApp.html](https://github.com/khoafalcon/HSK3/raw/refs/heads/main/HSK3-MiniApp.html), lưu về máy rồi mở bằng Chrome/Edge. File đã kèm giao diện, bài tập và âm thanh offline.

**Phát triển:** clone repo, mở `index.html` tại thư mục gốc. Chỉnh mã nguồn trong `assets`, sau đó chạy `node tools/build-standalone.cjs` để cập nhật bản HTML độc lập trước khi commit.

## Giao diện Liquid Glass

- Nền xanh ngọc chuyển màu nhẹ, thẻ kính mờ và thanh điều hướng nổi.
- Bố cục tự điều chỉnh cho điện thoại, máy tính bảng và máy tính; chừa khoảng trống cho thanh điều hướng và vùng an toàn trên iPhone.
- Nút mặt trăng/mặt trời đổi sáng/tối và ghi nhớ lựa chọn. Khi chưa chọn, giao diện theo cài đặt hệ thống.
- Mở/thu gọn thẻ từ vựng, nghe phát âm, đánh dấu đã nhớ/cần ôn và vòng tiến độ cập nhật từ dữ liệu thật.
- Các nút dùng được bằng bàn phím; phím mũi tên trái/phải chuyển tab. Tôn trọng thiết lập giảm chuyển động và có nền thay thế khi trình duyệt không hỗ trợ kính mờ.

Không cần mạng để tải giao diện, font hoặc biểu tượng.

Đã kiểm tra cú pháp JavaScript, cấu trúc nội dung và luồng tương tác bằng DOM mô phỏng. Chưa kiểm chứng bố cục trực quan hoặc âm thanh từ loa trên trình duyệt thật trong môi trường này.

## Luyện tập mở rộng

- 1.096 câu/dạng luyện: 412 câu nhận diện chữ/nghĩa, 160 câu điền từ (80 ngữ cảnh × chọn đáp án hoặc tự nhập), 40 câu ngữ pháp, 40 câu ghép cụm và 444 câu nghe (404 dạng nhận diện từ + 40 đoạn nghe hiểu).
- Chọn bài 1–20, loại bài và bộ 10/20/30/50 câu. App giới hạn số câu theo số từ/ngữ cảnh phù hợp, không lặp cùng nội dung trong một bộ. Bộ tổng hợp phân bổ các kỹ năng; bộ mới ưu tiên câu chưa làm.
- Bài điền từ chấp nhận chữ Hán hoặc pinyin có dấu thanh, bỏ qua khoảng trắng, chữ hoa và kiểu dấu nháy. Đây là bài luyện đúng từ được gợi ý, không phải chấm dịch tự do.
- Chọn riêng **Nghe hiểu → Chỉ đoạn nghe hiểu** để luyện 40 đoạn ngắn có câu hỏi về thông tin, thời gian, phủ định và suy luận đơn giản. Nghe bằng thanh phát, nghe lại không giới hạn hoặc giảm tốc độ còn 0,8×. Phải nghe xong một lần trước khi chấm. Lời thoại và bản dịch chỉ hiện sau khi trả lời.
- Mỗi câu có đáp án và giải thích. Kết quả có **Làm lại toàn bài**, **Luyện lại câu sai** và **Tạo bộ mới**. Chấm một câu chỉ ghi điểm một lần; retake là lượt mới và giữ thống kê các lượt trước.
- Lưu phiên đang làm, câu đã gặp và 20 kết quả gần đây bằng `hsk3clone_practice_v1`. Vào Luyện tập rồi bấm **Tiếp tục** sau khi mở lại. Nếu trình duyệt không cho lưu, app báo rõ và vẫn hoạt động trong phiên hiện tại.

Ngữ cảnh mới được soạn riêng để tránh dùng máy móc các ví dụ có lỗi trong dữ liệu cũ. Số lượng 1.096 tính các hướng luyện cùng một nội dung; đổi vị trí đáp án không được tính là câu mới. Đây là tài liệu luyện bổ trợ, không phải đề HSK chính thức hoặc nội dung đã được giáo viên/người bản ngữ thẩm định.

## Mở ứng dụng

**Bản dễ gửi:** [HSK3-MiniApp.html](HSK3-MiniApp.html) là file độc lập, đã nhúng toàn bộ CSS, JavaScript và 350 bản ghi âm (khoảng 22 MB). Chỉ cần gửi file này, tải về máy rồi mở bằng Chrome/Edge. Không cần thư mục `assets` hay giải nén. Có thể tạo lại từ mã nguồn bằng `node tools/build-standalone.cjs`.

Nếu dùng bản ZIP, phải **giải nén toàn bộ** trước khi mở `index.html`. Mở HTML ngay trong ZIP hoặc tách nó khỏi `assets` có thể làm mất giao diện và âm thanh. Tiến độ lưu theo địa chỉ file/trình duyệt; bản một file có thể bắt đầu với tiến độ riêng.

Nhấp đúp `index.html` để mở bằng trình duyệt. Không cần cài thư viện hay chạy bước build. Khi sao chép ứng dụng, hãy sao chép **cả thư mục** để giữ các tệp CSS và JavaScript đi kèm.

Để xem qua máy chủ local, chạy lệnh này tại thư mục repo `HSK3` nếu máy đã có Python:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Sau đó mở <http://127.0.0.1:5173>. Nhấn `Ctrl+C` để dừng máy chủ.

## Các phần có thể chỉnh sửa

| Tệp | Nội dung |
| --- | --- |
| `index.html` | Bố cục, các tab và nội dung giao diện cố định |
| `assets/css/styles.css` | Màu sắc, bố cục, giao diện sáng/tối |
| `assets/js/data.js` | Dữ liệu bài học gốc; bộ 32 bài tập cũ được giữ làm dữ liệu nguồn |
| `assets/js/app.js` | Từ vựng, ngữ pháp, phát âm và thống kê chung |
| `assets/js/practice-content.js` | Ngữ cảnh, lời giải, đoạn nghe và quy tắc chọn từ nhiễu |
| `assets/js/practice-engine.js` | Xây ngân hàng, tạo bộ, chấm điểm, retake và lưu phiên |
| `assets/js/practice-ui.js` | Giao diện luyện tập và trình phát bài nghe |
| `assets/css/practice.css` | Bố cục luyện tập theo giao diện kính hiện tại |
| `assets/js/audio-map.js` | Ánh xạ văn bản tiếng Trung sang WAV nội bộ |

Các tệp JavaScript dùng script thường, theo thứ tự khai báo trong `index.html`, để vẫn mở trực tiếp được từ ổ đĩa. App không gọi API để tạo bài hoặc đọc âm thanh khi đang sử dụng.

## Tiến độ học

Bản clone lưu tiến độ trên trình duyệt với tiền tố `hsk3clone_`, tách khỏi tiền tố `hsk3demo_` của bản gốc. Tiến độ cũ không tự chuyển sang bản clone. Giữ cùng trình duyệt và cùng địa chỉ truy cập để dùng lại tiến độ; mở bằng file và mở qua máy chủ local có vùng lưu trữ khác nhau.

Phát âm ưu tiên các file WAV tiếng Trung đi kèm trong `assets/audio` (khoảng 16 MB), bao phủ đủ 314 mục từ vựng và 40 đoạn nghe hiểu. Không cần mạng, tài khoản hay cài giọng đọc vào hệ điều hành. Bấm **Nghe phát âm** trên thẻ; bấm lại để dừng. Đổi bài hoặc đổi tab sẽ dừng âm thanh đang phát.

Nếu trình duyệt chặn âm thanh, app hiển thị thông báo cùng thanh phát để thử bằng nút điều khiển của trình duyệt. Khi sao chép app, cần giữ cả thư mục `assets/audio`. Nếu vẫn không nghe, kiểm tra âm lượng và trạng thái tắt tiếng của tab.

Các file âm thanh được tổng hợp bằng Piper. Nguồn mô hình và thông tin tạo âm thanh nằm trong `assets/audio/NOTICE.md`. Giọng trình duyệt chỉ là phương án dự phòng cho từ mới chưa có file âm thanh; app sẽ báo rõ khi phương án này không khả dụng.

Có thể chạy `node tools/test-pronunciation.cjs` để kiểm tra bộ file và xử lý trạng thái phát âm bằng các API giả lập. Việc kiểm tra này không xác nhận âm thanh thực tế từ loa của trình duyệt.

Chạy `node tools/test-practice.cjs` để kiểm tra toàn bộ đáp án, đủ dạng trên 20 bài, bộ đề ngẫu nhiên, retake, chống cộng điểm hai lần và khôi phục lưu trữ. Kiểm tra tương tác DOM bằng `node tools/test-practice-ui.mjs PATH_TO_HAPPY_DOM/lib/index.js` với `happy-dom@20.14.6` trong môi trường kiểm thử riêng. Thư viện kiểm thử không cần thiết để chạy ứng dụng.

## Phạm vi bản clone

Các mục Từ vựng, Ngữ pháp và tiến độ cũ của bản clone được giữ lại. Mục Luyện tập dùng bộ nội dung mới, bổ sung vào thống kê chung; nút xoá toàn bộ tiến độ cũng xoá phiên luyện mới. File HTML gốc không bị sửa.
