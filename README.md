# Calendar Note

เว็บแอปหน้าเดียวสำหรับสร้างนัดหมายหลายรายการ แล้วบันทึกลง Google Calendar ครั้งเดียว พร้อมอัปโหลดไฟล์แนบไป Google Drive และแนบไฟล์เข้ากับ Calendar Event

## เข้าใช้งาน

สามารถเข้าใช้งานเว็บได้ที่:

[เปิดใช้งาน Calendar Note](https://kunat-calendar-note.vercel.app)

> หมายเหตุ: เปลี่ยนลิงก์ด้านบนเป็น URL จริงที่ได้จาก Vercel หลัง Deploy

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
- Popup alert น่ารักตามธีม
- บันทึกลง Google Calendar ของผู้ใช้เอง
- ตั้งค่าแจ้งเตือนก่อนนัดหมาย 1 วันใน Google Calendar

## การตั้งค่า Google API

1. เข้า Google Cloud Console
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่
3. Enable API ต่อไปนี้
   - Google Calendar API
   - Google Drive API
4. ไปที่ APIs & Services > Credentials หรือ Google Auth Platform > Clients
5. สร้าง OAuth Client ID แบบ Web application
6. เพิ่ม Authorized JavaScript origins เช่น
   - `http://localhost:3000`
   - URL จริงจาก Vercel เช่น `https://your-vercel-url.vercel.app`
7. เพิ่ม Test users ถ้าแอปยังอยู่ในโหมด Testing
8. คัดลอก Client ID มาใส่ในไฟล์ `.env.local` หรือ Environment Variables บน Vercel

## Environment Variables

สำหรับใช้งานในเครื่อง ให้สร้างไฟล์ `.env.local`

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

สำหรับใช้งานบน Vercel ให้เพิ่ม Environment Variable นี้ใน Project Settings

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

## ติดตั้งและรันในเครื่อง

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

## Deploy บน Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. Import repository เข้า Vercel
3. เลือก Framework เป็น Next.js
4. เพิ่ม Environment Variable

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

5. กด Deploy
6. นำ URL ที่ได้จาก Vercel ไปเพิ่มใน Google OAuth ที่ Authorized JavaScript origins

ตัวอย่าง URL จาก Vercel

```txt
https://your-vercel-url.vercel.app
```

## หมายเหตุเรื่องไฟล์แนบ

Google Calendar API แนบไฟล์จากเครื่องโดยตรงไม่ได้ จึงต้องอัปโหลดไฟล์ไป Google Drive ก่อน แล้วนำลิงก์ไฟล์ Drive ไปแนบใน Calendar Event โดยโค้ดในโปรเจกต์นี้ทำ flow ดังกล่าวไว้แล้ว

Flow การทำงานของไฟล์แนบ:

```txt
เลือกไฟล์จากเครื่อง
> อัปโหลดไฟล์ไป Google Drive
> ได้ลิงก์ไฟล์จาก Drive
> แนบลิงก์ไฟล์เข้า Google Calendar Event
```

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