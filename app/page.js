"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

const DEFAULT_REMINDER_MINUTES = 24 * 60;

const templates = [
  {
    id: "",
    label: "เลือก Template เพื่อเติมข้อมูลอัตโนมัติ",
    title: "",
    description: "",
    duration: 60,
  },
  {
    id: "diabetes",
    label: "[หมอนัด] ตรวจเลือด (เบาหวาน และ ไขมัน)",
    title: "[หมอนัด] ตรวจเลือด (เบาหวาน และ ไขมัน)",
    description:
      "- งดอาหารและน้ำอย่างน้อย 8 ชั่วโมงก่อนตรวจ\n- พกบัตรประชาชนไปด้วย\n- พกใบนัดไปด้วย (ถ้ามี)",
    startTime: "05:30",
    endTime: "12:00",
    duration: 90,
  },
  {
    id: "eye-checkup",
    label: "[หมอนัด] ขยายม่านตาเพื่อตรวจ (ตรวจตา)",
    title: "[หมอนัด] ขยายม่านตาเพื่อตรวจ (ตรวจตา)",
    description:
      "- ไปก่อนเที่ยง เพื่อยื่นบัตร เริ่มหยอด 13.00 น. เป็นต้น\n- พกบัตรประชาชนไปด้วย\n- พกใบนัดไปด้วย (ถ้ามี)",
    startTime: "11:00",
    endTime: "14:30",
    duration: 150,
  },
  {
    id: "blood-test",
    label: "[หมอนัด] ตรวจลิ่มเลือด (โรคเกี่ยวกับเลือด)",
    title: "[หมอนัด] ตรวจลิ่มเลือด (โรคเกี่ยวกับเลือด)",
    description:
      "- งดอาหารและน้ำอย่างน้อย 8 ชั่วโมงก่อนตรวจ\n- พกบัตรประชาชนไปด้วย\n- พกใบนัดไปด้วย (ถ้ามี)\n- พกสมุดวาฟารินไปด้วย",
    startTime: "05:30",
    endTime: "12:00",
    duration: 90,
  },
  {
    id: "refill-drugs",
    label: "[หมอนัด] รับยาต่อเนื่อง",
    title: "[หมอนัด] รับยาต่อเนื่อง",
    description:
      "- ไปหลังเที่ยงก็ได้ ไม่ต้องรีบมาก\n- พกบัตรประชาชนไปด้วย\n- พกใบนัดไปด้วย (ถ้ามี)",
    startTime: "13:00",
    endTime: "14:30",
    duration: 90,
  },
];

const nowRounded = () => {
  const date = new Date();
  const minutes = date.getMinutes();
  const add = minutes === 0 ? 30 : 30 - (minutes % 30);

  date.setMinutes(minutes + add, 0, 0);
  return date;
};

const formatDateInput = (date) => {
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDateOnly = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();

  if (Number.isNaN(date.getTime())) {
    return formatDateInput(new Date()).split("T")[0];
  }

  return formatDateInput(date).split("T")[0];
};

const combineDateAndTime = (dateInput, time = "09:00") => {
  return `${getDateOnly(dateInput)}T${time}`;
};

const addMinutes = (dateInput, minutes) => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return formatDateInput(nowRounded());
  }

  date.setMinutes(date.getMinutes() + minutes);
  return formatDateInput(date);
};

const createDefaultForm = () => {
  const start = formatDateInput(nowRounded());

  return {
    templateId: "",
    title: "",
    description: "",
    inviteEmails: [],
    startDateTime: start,
    endDateTime: addMinutes(start, 60),
    files: [],
  };
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const fileSizeLabel = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function Home() {
  const [form, setForm] = useState(createDefaultForm);
  const [emailDraft, setEmailDraft] = useState("");
  const [items, setItems] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("พร้อมบันทึกนัดหมายของคุณ");
  const [notice, setNotice] = useState({ type: "info", message: "" });
  const [fileInputKey, setFileInputKey] = useState(0);
  const [cuteAlert, setCuteAlert] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const timezone = useMemo(() => {
    if (typeof Intl === "undefined") return "Asia/Bangkok";
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok";
  }, []);

  const openCuteAlert = ({ type = "info", title, message }) => {
    setCuteAlert({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeCuteAlert = () => {
    setCuteAlert((current) => ({
      ...current,
      open: false,
    }));
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("calendar-note-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "calendar-note-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  useEffect(() => {
    const initGoogle = () => {
      if (!clientId) {
        setStatusText("ยังไม่ได้ตั้งค่า Google Client ID");
        return;
      }

      if (!window.google?.accounts?.oauth2) return;

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: () => {},
      });

      setIsGoogleReady(true);
      setStatusText("พร้อมเชื่อมต่อ Google Calendar");
    };

    if (window.google?.accounts?.oauth2) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () => {
      setNotice({
        type: "error",
        message: "โหลด Google Identity Services ไม่สำเร็จ",
      });
      setStatusText("โหลด Google ไม่สำเร็จ");
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [clientId]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applyTemplate = (templateId) => {
    const selected = templates.find((template) => template.id === templateId);
    if (!selected) return;

    if (!selected.id) {
      setForm((current) => ({
        ...current,
        templateId: "",
      }));
      return;
    }

    const today = new Date();
    const startDateTime = combineDateAndTime(
      today,
      selected.startTime || "09:00",
    );

    const rawEndDateTime = combineDateAndTime(
      today,
      selected.endTime || "10:00",
    );

    const endDateTime =
      new Date(rawEndDateTime) > new Date(startDateTime)
        ? rawEndDateTime
        : addMinutes(startDateTime, selected.duration || 60);

    setForm((current) => ({
      ...current,
      templateId,
      title: selected.title || current.title,
      description: selected.description || current.description,
      startDateTime,
      endDateTime,
    }));
  };

  const getEmailsFromDraft = () => {
    return emailDraft
      .split(/[,&\n\s]+/)
      .map((email) => email.trim())
      .filter(Boolean);
  };

  const getEventWithDraftEmails = (eventData) => {
    const rawEmails = getEmailsFromDraft();
    const invalid = rawEmails.filter((email) => !isValidEmail(email));

    if (invalid.length) {
      return {
        eventData,
        error: `อีเมลไม่ถูกต้อง: ${invalid.join(", ")}`,
      };
    }

    return {
      eventData: {
        ...eventData,
        inviteEmails: Array.from(
          new Set([...eventData.inviteEmails, ...rawEmails]),
        ),
      },
      error: "",
    };
  };

  const addEmailsFromDraft = () => {
    const rawEmails = getEmailsFromDraft();

    if (!rawEmails.length) return;

    const invalid = rawEmails.filter((email) => !isValidEmail(email));

    if (invalid.length) {
      setNotice({
        type: "error",
        message: `อีเมลไม่ถูกต้อง: ${invalid.join(", ")}`,
      });

      openCuteAlert({
        type: "error",
        title: "อีเมลไม่ถูกต้อง",
        message: `ตรวจสอบอีเมลนี้อีกครั้ง: ${invalid.join(", ")}`,
      });

      return;
    }

    setForm((current) => ({
      ...current,
      inviteEmails: Array.from(
        new Set([...current.inviteEmails, ...rawEmails]),
      ),
    }));

    setEmailDraft("");
    setNotice({ type: "success", message: "เพิ่มอีเมล invite แล้ว" });
  };

  const removeEmail = (email) => {
    setForm((current) => ({
      ...current,
      inviteEmails: current.inviteEmails.filter((item) => item !== email),
    }));
  };

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    setForm((current) => ({
      ...current,
      files: [...current.files, ...selectedFiles].slice(0, 25),
    }));

    setNotice({
      type: "info",
      message: "เลือกไฟล์แล้ว ระบบจะอัปโหลดไป Drive ตอนกดบันทึก",
    });
  };

  const removeFile = (index) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const validateEvent = (eventData) => {
    if (!eventData.title.trim()) return "กรุณากรอกชื่อรายการ";
    if (!eventData.startDateTime) return "กรุณาเลือกวันเวลาที่เริ่ม";
    if (!eventData.endDateTime) return "กรุณาเลือกวันเวลาสิ้นสุด";

    if (new Date(eventData.endDateTime) <= new Date(eventData.startDateTime)) {
      return "วันเวลาสิ้นสุดต้องมากกว่าวันเวลาที่เริ่ม";
    }

    const invalidEmails = eventData.inviteEmails.filter(
      (email) => !isValidEmail(email),
    );

    if (invalidEmails.length) {
      return `อีเมลไม่ถูกต้อง: ${invalidEmails.join(", ")}`;
    }

    if (eventData.files.length > 25) {
      return "แนบไฟล์ได้สูงสุด 25 ไฟล์ต่อรายการ";
    }

    return "";
  };

  const clearForm = () => {
    setForm(createDefaultForm());
    setEmailDraft("");
    setFileInputKey((key) => key + 1);
  };

  const addItem = () => {
    const { eventData, error: emailError } = getEventWithDraftEmails(form);

    if (emailError) {
      setNotice({ type: "error", message: emailError });

      openCuteAlert({
        type: "error",
        title: "ยังเพิ่มเข้าคิวไม่ได้",
        message: emailError,
      });

      return;
    }

    const error = validateEvent(eventData);

    if (error) {
      setNotice({ type: "error", message: error });

      openCuteAlert({
        type: "error",
        title: "ข้อมูลยังไม่ครบ",
        message: error,
      });

      return;
    }

    setItems((current) => [
      ...current,
      {
        ...eventData,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
      },
    ]);

    clearForm();

    setNotice({
      type: "success",
      message: "เพิ่มรายการเข้าคิวแล้ว กดบันทึกทั้งหมดเมื่อพร้อม",
    });

    openCuteAlert({
      type: "success",
      title: "เพิ่มเข้าคิวแล้ว ✨",
      message: "รายการนี้พร้อมรอบันทึกลง Google Calendar แล้ว",
    });
  };

  const editItem = (item) => {
    setItems((current) => current.filter((queued) => queued.id !== item.id));

    setForm({
      templateId: item.templateId,
      title: item.title,
      description: item.description,
      inviteEmails: item.inviteEmails,
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      files: item.files,
    });

    setFileInputKey((key) => key + 1);
    setNotice({ type: "info", message: "ดึงรายการกลับมาแก้ไขแล้ว" });
  };

  const deleteItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setNotice({ type: "info", message: "ลบรายการออกจากคิวแล้ว" });
  };

  const getAccessToken = () => {
    return new Promise((resolve, reject) => {
      if (!clientId) {
        reject(
          new Error(
            "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID ในไฟล์ .env.local",
          ),
        );
        return;
      }

      if (!tokenClientRef.current) {
        reject(new Error("Google Identity Services ยังไม่พร้อมใช้งาน"));
        return;
      }

      tokenClientRef.current.callback = (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        accessTokenRef.current = response.access_token;
        setIsConnected(true);
        resolve(response.access_token);
      };

      tokenClientRef.current.requestAccessToken({
        prompt: accessTokenRef.current ? "" : "consent",
      });
    });
  };

  const uploadFileToDrive = async (file, token) => {
    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
    };

    const boundary = `calendar_note_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const fileBuffer = await file.arrayBuffer();

    const multipartBody = new Blob(
      [
        delimiter,
        "Content-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(metadata),
        delimiter,
        `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
        fileBuffer,
        closeDelimiter,
      ],
      { type: `multipart/related; boundary=${boundary}` },
    );

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: multipartBody,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || `อัปโหลดไฟล์ ${file.name} ไม่สำเร็จ`,
      );
    }

    return data;
  };

  const createCalendarEvent = async (item, attachments, token) => {
    const eventBody = {
      summary: item.title.trim(),
      description: `${item.description || ""}\n\nสร้างจาก Calendar Note ✨`,
      start: {
        dateTime: new Date(item.startDateTime).toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: new Date(item.endDateTime).toISOString(),
        timeZone: timezone,
      },
      attendees: item.inviteEmails.map((email) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: "popup",
            minutes: DEFAULT_REMINDER_MINUTES,
          },
        ],
      },
      attachments,
    };

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?supportsAttachments=true&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `บันทึก ${item.title} ไม่สำเร็จ`);
    }

    return data;
  };

  const saveAll = async () => {
    if (isSaving) return;

    let eventsToSave = items;

    if (!items.length) {
      const { eventData, error: emailError } = getEventWithDraftEmails(form);

      if (emailError) {
        setNotice({ type: "error", message: emailError });

        openCuteAlert({
          type: "error",
          title: "ยังบันทึกไม่ได้",
          message: emailError,
        });

        return;
      }

      const error = validateEvent(eventData);

      if (error) {
        setNotice({ type: "error", message: error });

        openCuteAlert({
          type: "error",
          title: "ข้อมูลยังไม่ครบ",
          message: error,
        });

        return;
      }

      eventsToSave = [{ ...eventData, id: "single-current-form" }];
    }

    try {
      setIsSaving(true);
      setProgress(4);

      setNotice({
        type: "info",
        message: "กำลังขอสิทธิ์ใช้งาน Google Calendar และ Drive",
      });

      setStatusText("กำลังเชื่อมต่อ Google...");

      openCuteAlert({
        type: "loading",
        title: "กำลังบันทึกนัดหมาย",
        message:
          "กำลังเชื่อมต่อ Google Calendar และเตรียมไฟล์แนบให้อยู่ รอสักครู่...",
      });

      const token = await getAccessToken();

      const totalSteps = eventsToSave.reduce(
        (sum, item) => sum + item.files.length + 1,
        0,
      );

      let completedSteps = 0;
      const createdEvents = [];

      for (const item of eventsToSave) {
        setStatusText(`กำลังเตรียมไฟล์ของ “${item.title}”`);

        const uploadedFiles = [];

        for (const file of item.files) {
          const uploaded = await uploadFileToDrive(file, token);
          uploadedFiles.push(uploaded);

          completedSteps += 1;
          setProgress(Math.round((completedSteps / totalSteps) * 92));
        }

        const attachments = uploadedFiles
          .filter((file) => file.webViewLink)
          .map((file) => ({
            fileUrl: file.webViewLink,
            title: file.name,
            mimeType: file.mimeType,
          }));

        setStatusText(`กำลังบันทึก “${item.title}” ลง Calendar`);

        const event = await createCalendarEvent(item, attachments, token);
        createdEvents.push(event);

        completedSteps += 1;
        setProgress(
          Math.max(8, Math.round((completedSteps / totalSteps) * 100)),
        );
      }

      setItems([]);
      clearForm();
      setProgress(100);
      setStatusText(`บันทึกสำเร็จ ${createdEvents.length} รายการ`);

      setNotice({
        type: "success",
        message: `บันทึกลง Google Calendar สำเร็จ ${createdEvents.length} รายการ`,
      });

      openCuteAlert({
        type: "success",
        title: "บันทึกสำเร็จแล้ว 🎉",
        message: `สร้าง Event ใน Google Calendar สำเร็จทั้งหมด ${createdEvents.length} รายการ พร้อมแจ้งเตือนก่อนนัดหมาย 1 วัน`,
      });
    } catch (error) {
      const message = error.message || "บันทึกไม่สำเร็จ";

      setNotice({
        type: "error",
        message,
      });

      setStatusText("บันทึกไม่สำเร็จ ตรวจสอบการตั้งค่าอีกครั้ง");

      openCuteAlert({
        type: "error",
        title: "บันทึกไม่สำเร็จ",
        message,
      });
    } finally {
      setTimeout(() => {
        setIsSaving(false);
        setProgress(0);
      }, 900);
    }
  };

  return (
    <main
      id="calendar-note-screen"
      className={`${
        darkMode ? "dark" : ""
      } h-[var(--app-height)] overflow-hidden bg-gradient-to-br from-pink-50 via-violet-50 to-cyan-50 text-[13px] text-slate-800 transition-colors duration-500 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-slate-100`}
      style={{
        paddingTop: "max(var(--app-pad), env(safe-area-inset-top))",
        paddingRight: "max(var(--app-pad), env(safe-area-inset-right))",
        paddingBottom: "max(var(--app-pad), env(safe-area-inset-bottom))",
        paddingLeft: "max(var(--app-pad), env(safe-area-inset-left))",
      }}
    >
      <style>{`
        #calendar-note-screen,
        #calendar-note-screen * {
          cursor: pointer !important;
        }

        @media (max-width: 640px) {
          #calendar-note-screen .calendar-form-card input,
          #calendar-note-screen .calendar-form-card textarea,
          #calendar-note-screen .calendar-form-card select {
            font-size: 12.5px !important;
            line-height: 1.45 !important;
          }

          #calendar-note-screen .calendar-form-card input::placeholder,
          #calendar-note-screen .calendar-form-card textarea::placeholder {
            font-size: 12.5px !important;
          }

          #calendar-note-screen .calendar-form-card select,
          #calendar-note-screen .calendar-form-card input:not([type="file"]) {
            min-height: 44px;
          }

          #calendar-note-screen .calendar-form-card textarea {
            min-height: 132px;
          }

          #calendar-note-screen .calendar-form-card .form-card-title {
            font-size: 15px !important;
            line-height: 1.35 !important;
          }

          #calendar-note-screen .calendar-form-card .form-label {
            font-size: 11.5px !important;
          }

          #calendar-note-screen .calendar-form-card .form-button {
            font-size: 12px !important;
          }
        }

        @keyframes cute-pop {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cute-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes cute-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        .cute-alert-card {
          animation: cute-pop 0.22s ease-out both;
        }

        .cute-alert-icon {
          animation: cute-float 1.6s ease-in-out infinite;
        }

        .cute-alert-loading {
          animation: cute-spin 0.9s linear infinite;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="floaty absolute left-8 top-16 rounded-3xl bg-pink-200/45 px-4 py-2 text-[11px] font-medium text-pink-700 blur-[0.2px] dark:bg-pink-500/15 dark:text-pink-100">
          npm run dev
        </div>

        <div className="floaty-delay absolute right-8 top-28 rounded-full bg-cyan-200/45 px-4 py-2 text-[11px] font-medium text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-100">
          {"<Calendar />"}
        </div>

        <div className="floaty-slow absolute bottom-24 left-8 rounded-3xl bg-violet-200/45 px-4 py-2 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-100">
          git commit -m ✨
        </div>
      </div>

      <section className="mx-auto flex h-full min-h-0 w-full max-w-[460px] items-center justify-center">
        <div className="phone-shadow relative h-full max-h-[860px] w-full max-w-[430px] rounded-[2.85rem] border border-slate-300/80 bg-slate-950/90 p-2.5 shadow-2xl shadow-slate-300/50 backdrop-blur dark:border-slate-700/80 dark:bg-slate-950 dark:shadow-black/40">
          <div className="relative h-full min-h-0 overflow-hidden rounded-[2.35rem] border border-white/80 bg-[#fff9fd] transition-colors duration-500 dark:border-white/10 dark:bg-[#121526]">
            <div className="soft-scrollbar h-full overflow-y-auto overscroll-contain pb-32">
              <div className="sticky top-0 z-30 rounded-t-[2.35rem] border-b border-slate-900/5 bg-[#fff9fd]/90 px-5 pb-3 pt-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#121526]/90">
                <div className="mx-auto mb-3 h-1 w-20 rounded-full bg-slate-900/80 dark:bg-white/80" />

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-violet-500 dark:text-violet-300">
                      Kunat ❤️
                    </p>

                    <h2 className="mt-1 text-[20px] font-semibold leading-none text-slate-950 dark:text-white">
                      Calendar Note
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDarkMode((current) => !current)}
                    className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-[12px] font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/10"
                  >
                    {darkMode ? "🌙 Dark" : "☀️ Light"}
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                  <div
                    className="progress-glow h-1.5 rounded-full bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 transition-all duration-500"
                    style={{
                      width: `${isSaving ? Math.max(progress, 8) : progress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-300">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isSaving
                          ? "pulse-dot bg-violet-400"
                          : isConnected
                            ? "bg-emerald-400"
                            : "bg-amber-300"
                      }`}
                    />
                    <span className="truncate">{statusText}</span>
                  </span>

                  <span className="shrink-0 pl-2">
                    {progress ? `${progress}%` : timezone}
                  </span>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="calendar-form-card rounded-[2rem] border border-white bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-300">
                        ฟอร์มนัดหมาย
                      </p>

                      <h3 className="form-card-title text-[16px] font-semibold text-slate-900 dark:text-white">
                        กรอกข้อมูล Event
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100">
                      {items.length ? `${items.length} คิว` : "ยังไม่มีคิว"}
                    </span>
                  </div>

                  <label className="mb-3 block">
                    <span className="form-label mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      Template
                    </span>

                    <select
                      value={form.templateId}
                      onChange={(event) => applyTemplate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-900/80 dark:focus:ring-violet-400/15"
                    >
                      {templates.map((template) => (
                        <option
                          key={template.id || "empty"}
                          value={template.id}
                        >
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mb-3 block">
                    <span className="form-label mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      ชื่อ
                    </span>

                    <input
                      value={form.title}
                      onChange={(event) =>
                        updateForm("title", event.target.value)
                      }
                      placeholder="เช่น นัดตรวจตามใบนัด"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] outline-none transition placeholder:text-slate-300 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-900/80 dark:placeholder:text-slate-500 dark:focus:ring-violet-400/15"
                    />
                  </label>

                  <label className="mb-3 block">
                    <span className="form-label mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      รายละเอียด
                    </span>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      rows={5}
                      placeholder="รายละเอียด สิ่งที่ต้องเตรียม หรือ note เพิ่มเติม"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] leading-6 outline-none transition placeholder:text-slate-300 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-900/80 dark:placeholder:text-slate-500 dark:focus:ring-violet-400/15"
                    />
                  </label>

                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/80">
                    <span className="form-label mb-2 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      อีเมล invite หลายคน
                    </span>

                    <div className="flex gap-2">
                      <input
                        value={emailDraft}
                        onChange={(event) => setEmailDraft(event.target.value)}
                        onBlur={addEmailsFromDraft}
                        onKeyDown={(event) => {
                          if (["Enter", ",", "Tab"].includes(event.key)) {
                            event.preventDefault();
                            addEmailsFromDraft();
                          }
                        }}
                        placeholder="พิมพ์อีเมล แล้วกด Enter"
                        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-300 dark:placeholder:text-slate-500"
                      />

                      <button
                        type="button"
                        onClick={addEmailsFromDraft}
                        className="form-button rounded-xl bg-violet-100 px-3 py-2 text-[12px] font-medium text-violet-700 transition hover:bg-violet-200 dark:bg-violet-400/15 dark:text-violet-100"
                      >
                        เพิ่ม
                      </button>
                    </div>

                    {form.inviteEmails.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.inviteEmails.map((email) => (
                          <button
                            key={email}
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] text-cyan-700 transition hover:bg-red-50 hover:text-red-600 dark:bg-cyan-300/10 dark:text-cyan-100 dark:hover:bg-red-400/15 dark:hover:text-red-100"
                            title="คลิกเพื่อลบ"
                          >
                            {email} ✕
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-3 grid min-w-0 grid-cols-1 gap-3">
                    <label className="block min-w-0">
                      <span className="form-label mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                        วันเวลาที่เริ่ม
                      </span>

                      <input
                        type="datetime-local"
                        value={form.startDateTime}
                        onChange={(event) => {
                          const nextStart = event.target.value;
                          const duration = Math.max(
                            30,
                            Math.round(
                              (new Date(form.endDateTime) -
                                new Date(form.startDateTime)) /
                                60000,
                            ) || 60,
                          );

                          setForm((current) => ({
                            ...current,
                            startDateTime: nextStart,
                            endDateTime: addMinutes(nextStart, duration),
                          }));
                        }}
                        className="block w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[12px] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-900/80 dark:focus:ring-violet-400/15"
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="form-label mb-1.5 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                        วันเวลาสิ้นสุด
                      </span>

                      <input
                        type="datetime-local"
                        value={form.endDateTime}
                        onChange={(event) =>
                          updateForm("endDateTime", event.target.value)
                        }
                        className="block w-full min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[12px] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-900/80 dark:focus:ring-violet-400/15"
                      />
                    </label>
                  </div>

                  <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3 dark:border-white/15 dark:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="form-label block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                          แนบไฟล์
                        </span>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                          รูปภาพ ใบนัด PDF หรือไฟล์อื่น ๆ สูงสุด 25
                          ไฟล์ต่อรายการ
                        </p>
                      </div>

                      <label className="form-button rounded-2xl bg-slate-900 px-3 py-2 text-[12px] font-medium text-white transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-slate-950">
                        เลือกไฟล์
                        <input
                          key={fileInputKey}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={addFiles}
                        />
                      </label>
                    </div>

                    {form.files.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {form.files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 dark:bg-slate-900/80"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-slate-700 dark:text-slate-100">
                                {file.name}
                              </p>

                              <p className="text-[10px] text-slate-400">
                                {file.type || "unknown"} ·{" "}
                                {fileSizeLabel(file.size)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="form-button rounded-full bg-red-50 px-2 py-1 text-[11px] text-red-500 dark:bg-red-400/15 dark:text-red-100"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={addItem}
                      className="form-button rounded-2xl bg-white px-4 py-3 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10 dark:text-white dark:ring-white/10"
                    >
                      + เพิ่มรายการเข้าคิว
                    </button>

                    <button
                      type="button"
                      onClick={clearForm}
                      className="form-button rounded-2xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-500 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                {notice.message && (
                  <div
                    className={`mt-4 rounded-3xl px-4 py-3 text-[12px] leading-5 shadow-sm ${
                      notice.type === "success"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100"
                        : notice.type === "error"
                          ? "bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-100"
                          : "bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-100"
                    }`}
                  >
                    {notice.message}
                  </div>
                )}

                <div className="mt-4 rounded-[2rem] border border-white bg-white/78 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-300">
                        รายการที่รอบันทึก
                      </p>

                      <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                        Queue
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-pink-50 px-3 py-2 text-[12px] font-medium text-pink-700 dark:bg-pink-300/15 dark:text-pink-100">
                      {items.length} รายการ
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-3xl bg-slate-50 px-4 py-6 text-center dark:bg-white/[0.05]">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-100 to-cyan-100 text-[22px] dark:from-pink-400/20 dark:to-cyan-400/20">
                        🗓️
                      </div>

                      <p className="text-[13px] font-medium text-slate-700 dark:text-slate-100">
                        ยังไม่มีรายการในคิว
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        สามารถกรอกฟอร์มแล้วกดบันทึกได้เลย
                        หรือเพิ่มหลายรายการเข้าคิวก่อนก็ได้
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {items.map((item, index) => (
                        <article
                          key={item.id}
                          className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-900/60"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-100 text-[12px] font-semibold text-violet-700 dark:from-violet-400/20 dark:to-cyan-400/20 dark:text-violet-100">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                                {item.title}
                              </h4>

                              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                {new Date(item.startDateTime).toLocaleString(
                                  "th-TH",
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  },
                                )}
                                {" - "}
                                {new Date(item.endDateTime).toLocaleTimeString(
                                  "th-TH",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-400">
                                invite {item.inviteEmails.length} คน · ไฟล์{" "}
                                {item.files.length} ไฟล์
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => editItem(item)}
                              className="flex-1 rounded-2xl bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-violet-400/15"
                            >
                              แก้ไข
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteItem(item.id)}
                              className="flex-1 rounded-2xl bg-white px-3 py-2 text-[12px] font-medium text-red-500 transition hover:bg-red-50 dark:bg-white/10 dark:text-red-100 dark:hover:bg-red-400/15"
                            >
                              ลบ
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-40 rounded-b-[2.35rem] border-t border-slate-900/5 bg-[#fff9fd]/92 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#121526]/92">
              <button
                type="button"
                onClick={saveAll}
                disabled={isSaving || (!isGoogleReady && !!clientId)}
                className="shimmer w-full rounded-[1.5rem] bg-[linear-gradient(110deg,#f9a8d4,45%,#c4b5fd,55%,#a7f3d0)] px-4 py-3.5 text-[14px] font-semibold text-slate-950 shadow-lg shadow-violet-200/70 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 dark:shadow-violet-950/30"
              >
                {isSaving
                  ? "กำลังบันทึก..."
                  : items.length
                    ? `บันทึกทั้งหมด ${items.length} รายการ`
                    : "บันทึกรายการนี้ลง Google Calendar"}
              </button>

              <p className="mt-2 text-center text-[10.5px] leading-5 text-slate-400 dark:text-slate-500">
                Crated by Kunat Kamprommapirak 💕
              </p>
            </div>

            {cuteAlert.open && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-5 backdrop-blur-sm">
                <div className="cute-alert-card w-full max-w-[320px] rounded-[2rem] border border-white/80 bg-white/95 p-5 text-center shadow-2xl shadow-violet-200/70 dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50">
                  <div
                    className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-[30px] shadow-sm ${
                      cuteAlert.type === "success"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-300/15 dark:text-emerald-100"
                        : cuteAlert.type === "error"
                          ? "bg-red-100 text-red-600 dark:bg-red-300/15 dark:text-red-100"
                          : cuteAlert.type === "loading"
                            ? "bg-violet-100 text-violet-600 dark:bg-violet-300/15 dark:text-violet-100"
                            : "bg-cyan-100 text-cyan-600 dark:bg-cyan-300/15 dark:text-cyan-100"
                    }`}
                  >
                    {cuteAlert.type === "success" && (
                      <span className="cute-alert-icon">🌷</span>
                    )}

                    {cuteAlert.type === "error" && (
                      <span className="cute-alert-icon">🧸</span>
                    )}

                    {cuteAlert.type === "loading" && (
                      <span className="cute-alert-loading block h-7 w-7 rounded-full border-4 border-violet-200 border-t-violet-500" />
                    )}

                    {cuteAlert.type === "info" && (
                      <span className="cute-alert-icon">✨</span>
                    )}
                  </div>

                  <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white">
                    {cuteAlert.title}
                  </h3>

                  <p className="mt-2 text-[12.5px] leading-6 text-slate-500 dark:text-slate-300">
                    {cuteAlert.message}
                  </p>

                  {cuteAlert.type !== "loading" && (
                    <button
                      type="button"
                      onClick={closeCuteAlert}
                      className="mt-5 w-full rounded-[1.4rem] bg-[linear-gradient(110deg,#f9a8d4,#c4b5fd,#a7f3d0)] px-4 py-3 text-[13px] font-semibold text-slate-900 shadow-lg shadow-violet-100 transition hover:-translate-y-0.5 hover:shadow-xl dark:shadow-violet-950/30"
                    >
                      รับทราบ
                    </button>
                  )}

                  {cuteAlert.type === "loading" && (
                    <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
                      ห้ามปิดหน้านี้ระหว่างกำลังบันทึก
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
