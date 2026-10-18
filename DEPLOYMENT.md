# 🌐 ChatSphere Live Deployment Guide (লাইভ করার সম্পূর্ণ গাইড)

ChatSphere লাইভ করার জন্য ২টি সহজ উপায় রয়েছে:
1. **তাত্ক্ষণিক ফ্রি লাইভ লিংক (১ মিনিটে আপনার পিসি থেকেই লাইভ লিংক)** — দ্রুত মোবাইল বা বন্ধুদের সাথে টেস্ট করার জন্য।
2. **স্থায়ী ফ্রি ক্লাউড হোস্টিং (২৪/৭ লাইভ)** — Render + Vercel ব্যবহার করে চিরস্থায়ীভাবে ফ্রিতে চালানোর জন্য।

---

## ⚡ পদ্ধতি ১: ১ মিনিটে তাত্ক্ষণিক লাইভ লিংক (Instant Public Link)

আপনার পিসিতে চলাকালীন সরাসরি একটি পাবলিক HTTPS লিংক তৈরি করতে পারবেন, যা যেকোনো মোবাইল বা যেকোনো ডিভাইস থেকে ব্রাউজ করা যাবে:

### ধাপ ১: লোকাল সার্ভারগুলো চালু রাখুন
রুট ডিরেক্টরি থেকে অ্যাপটি চালু রাখুন:
```bash
npm run dev
```

### ধাপ ২: একটি নতুন টার্মিনাল ওপেন করে লোকালটানেল চালান
```bash
npx localtunnel --port 5173
```
এটি সাথে সাথে একটি পাবলিক লিংক দেবে, যেমন:
`https://chat-sphere-live.loca.lt`

> **টিপস**: যদি Ngrok ব্যবহার করতে চান:
> `ngrok http 5173`

---

## 🚀 পদ্ধতি ২: স্থায়ী ক্লাউড হোস্টিং (Render + Vercel - 100% Free)

এটি সম্পূর্ণ বিনামূল্যে ২৪/৭ সার্ভার ও ক্লায়েন্ট লাইভ রাখার সেরা পদ্ধতি।

---

### ধাপ ১: গিটহাবে প্রজেক্ট পুশ করুন (GitHub Push)

1. প্রজেক্ট রুটে গিট ইনিশিয়ালাইজ করুন:
```bash
git init
git add .
git commit -m "feat: complete chatsphere production app"
```
2. আপনার [GitHub](https://github.com)-এ একটি নতুন রিপোজিটরি তৈরি করুন (যেমন: `chatsphere`).
3. লিংক করে পুশ করুন:
```bash
git remote add origin https://github.com/your-username/chatsphere.git
git branch -M main
git push -u origin main
```

---

### ধাপ ২: ব্যাকএন্ড ডিপ্লয় করুন (Render.com - Free Web Service)

1. [Render.com](https://render.com)-এ ফ্রি অ্যাকাউন্ট খুলুন বা লগইন করুন।
2. **New +** এ ক্লিক করে **Web Service** সিলেক্ট করুন।
3. আপনার GitHub রিপোজিটরি কানেক্ট করুন।
4. নিচের সেটিংসগুলো দিন:
   - **Name**: `chatsphere-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build && npx tsx src/seed.ts`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
5. **Environment Variables** সেকশনে এই ভেরিয়েবলগুলো যোগ করুন:
   - `PORT`: `5000`
   - `DATABASE_URL`: `file:./dev.db`
   - `JWT_SECRET`: `chatsphere_super_secret_jwt_key_2026_dev_prod`
   - `CLIENT_URL`: `https://your-frontend-app.vercel.app` *(সামনে ফ্রন্টএন্ডের লিংক দেবেন)*
6. **Deploy Web Service**-এ ক্লিক করুন।
   - ৩-৪ মিনিটের মধ্যে আপনার ব্যাকএন্ড লাইভ হয়ে যাবে এবং একটি URL পাবেন (যেমন: `https://chatsphere-server.onrender.com`).

---

### ধাপ ৩: ফ্রন্টএন্ড ডিপ্লয় করুন (Vercel - Free Static Hosting)

1. [Vercel.com](https://vercel.com)-এ লগইন করুন।
2. **Add New...** -> **Project** সিলেক্ট করুন এবং আপনার GitHub রিপোজিটরি ইমপোর্ট করুন।
3. নিচের সেটিংস দিন:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `Edit` এ ক্লিক করে `client` সিলেক্ট করুন।
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** এ নিচের ভেরিয়েবলটি দিন:
   - **Key**: `VITE_SERVER_URL`
   - **Value**: আপনার Render ব্যাকএন্ডের URL (যেমন: `https://chatsphere-server.onrender.com`)
5. **Deploy** বাটনে ক্লিক করুন।
   - ১ মিনিটের মধ্যেই আপনার ক্লায়েন্ট লাইভ হয়ে যাবে এবং আপনি একটি ফ্রি পাবলিক ডোমেন পেয়ে যাবেন:
   `https://chatsphere-app.vercel.app`

---

### ধাপ ৪: CORS আপডেট
আপনার Vercel ফ্রন্টএন্ড URL তৈরি হলে Render ড্যাশবোর্ডে গিয়ে `CLIENT_URL`-এর ভ্যালু হিসেবে আপনার Vercel ডোমেনটি বসিয়ে **Save Changes** দিন।

🎉 ব্যাস! আপনার **ChatSphere** এখন বিশ্বজুড়ে যেকোনো মোবাইল, ল্যাপটপ এবং ট্যাবলেট থেকে ২৪/৭ লাইভ চলবে!
