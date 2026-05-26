# Calendar Note

เว็บแอปหน้าเดียวสำหรับสร้างนัดหมายหลายรายการ แล้วบันทึกลง Google Calendar ครั้งเดียว พร้อมอัปโหลดไฟล์แนบไป Google Drive และแนบไฟล์เข้ากับ Calendar Event

## Tech Stack

- Next.js latest
- JavaScript ไม่ใช้ TypeScript
- Tailwind CSS
- Google Font: Kanit
- Google Identity Services OAuth
- Google Calendar API
- Google Drive API

## สิ่งที่มีในเว็บ

- UI ภาษาไทยเป็นหลัก
- Responsive layout แสดงเป็นกรอบเหมือนโทรศัพท์
- Light / Dark pastel theme
- Dropdown template เติมข้อมูลอัตโนมัติ
- แก้ไขฟิลด์หลังเลือก template ได้
- กรอกชื่อ รายละเอียด อีเมล invite หลายรายการ
- เลือกวันเวลาเริ่มและสิ้นสุดด้วย datetime picker
- แนบไฟล์หลายไฟล์ต่อรายการ
- เพิ่มหลายรายการเข้าคิว แล้วกดบันทึกทั้งหมดครั้งเดียว
- Loading progress bar และ micro animation แบบนุ่ม ๆ
- บันทึกลง Google Calendar ของผู้ใช้เอง

## การตั้งค่า Google API

1. เข้า Google Cloud Console
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. Enable API ต่อไปนี้
   - Google Calendar API
   - Google Drive API
4. ไปที่ APIs & Services > Credentials
5. สร้าง OAuth Client ID แบบ Web application
6. เพิ่ม Authorized JavaScript origins เช่น
   - `http://localhost:3000`
   - โดเมนจริงของคุณเมื่อ deploy แล้ว
7. คัดลอก Client ID มาใส่ในไฟล์ `.env.local`

## ติดตั้งและรัน

```bash
npm install
cp .env.example .env.local
npm run dev
```

จากนั้นแก้ `.env.local`

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

เปิดเว็บที่

```bash
http://localhost:3000
```

## หมายเหตุเรื่องไฟล์แนบ

Google Calendar API แนบไฟล์จากเครื่องโดยตรงไม่ได้ จึงต้องอัปโหลดไฟล์ไป Google Drive ก่อน แล้วนำลิงก์ไฟล์ Drive ไปแนบใน Calendar Event โดยโค้ดในโปรเจกต์นี้ทำ flow ดังกล่าวไว้แล้ว 

Scope ที่ใช้

```txt
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.file
```

## โครงสร้างไฟล์

```txt
calendar-note/
├─ app/
│  ├─ globals.css
│  ├─ layout.js
│  └─ page.js
├─ public/
│  └─ calendar-note.svg
├─ .env.example
├─ .gitignore
├─ jsconfig.json
├─ next.config.mjs
├─ package.json
├─ postcss.config.mjs
└─ README.md
```
