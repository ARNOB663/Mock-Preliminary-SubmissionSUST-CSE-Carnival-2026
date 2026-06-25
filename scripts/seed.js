/**
 * Seed script — populates MongoDB with realistic test data for the demo.
 * Run with: node scripts/seed.js
 *
 * Requires MONGODB_URI in env. Reads from .env.local automatically via Next's loader.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../lib/models/User.js";
import Profile from "../lib/models/Profile.js";
import Company from "../lib/models/Company.js";
import Job from "../lib/models/Job.js";
import Application from "../lib/models/Application.js";
import SavedJob from "../lib/models/SavedJob.js";
import Notification from "../lib/models/Notification.js";
import Conversation from "../lib/models/Conversation.js";
import Message from "../lib/models/Message.js";

// Allow .env.local too
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local.");
  process.exit(1);
}

const skills = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Python", "Django", "FastAPI", "Go", "Rust",
  "PostgreSQL", "MongoDB", "Redis", "AWS", "Docker",
  "Kubernetes", "GraphQL", "TailwindCSS", "Figma", "Git",
];

const cities = ["Dhaka", "Chattogram", "Sylhet", "Remote"];

async function run() {
  console.log("Connecting to", MONGODB_URI.replace(/\/\/.*@/, "//***@"));
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // Wipe existing data
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}), Profile.deleteMany({}), Company.deleteMany({}),
    Job.deleteMany({}), Application.deleteMany({}), SavedJob.deleteMany({}),
    Notification.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({}),
  ]);

  // Admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await User.create({
    name: "TechHire Admin",
    email: "admin@techhire.bd",
    password: adminPassword,
    role: "admin",
    emailVerified: new Date(),
  });
  console.log("+ admin");

  // Employers
  const employerPassword = await bcrypt.hash("employer123", 12);
  const emp1 = await User.create({
    name: "Faisal Karim",
    email: "faisal@pathao.com",
    password: employerPassword,
    role: "employer",
    emailVerified: new Date(),
  });
  const emp2 = await User.create({
    name: "Nadia Ahmed",
    email: "nadia@brainstation23.com",
    password: employerPassword,
    role: "employer",
    emailVerified: new Date(),
  });
  const emp3 = await User.create({
    name: "Rashid Khan",
    email: "rashid@socketinc.com",
    password: employerPassword,
    role: "employer",
    emailVerified: new Date(),
  });
  console.log("+ 3 employers");

  // Companies
  const pathao = await Company.create({
    ownerId: emp1._id,
    name: "Pathao",
    slug: "pathao",
    website: "https://pathao.com",
    industry: "Ride-sharing / Logistics",
    size: "201-500",
    description: "Bangladesh's leading ride-sharing and delivery platform, serving millions of riders daily.",
    location: "Dhaka",
    verified: true,
  });
  const bs23 = await Company.create({
    ownerId: emp2._id,
    name: "Brain Station 23",
    slug: "brain-station-23",
    website: "https://brainstation-23.com",
    industry: "Software Services",
    size: "500+",
    description: "One of Bangladesh's largest software companies, delivering solutions globally.",
    location: "Dhaka",
    verified: true,
  });
  const socket = await Company.create({
    ownerId: emp3._id,
    name: "Socket Inc.",
    slug: "socket-inc",
    website: "https://socketinc.com",
    industry: "Developer Tools",
    size: "11-50",
    description: "Building open-source developer infrastructure for modern teams.",
    location: "Remote",
    verified: false,
  });
  console.log("+ 3 companies");

  // Job seekers
  const seekerPassword = await bcrypt.hash("seeker123", 12);
  const seekerData = [
    { name: "Tanvir Hossain", email: "tanvir@gmail.com", headline: "Frontend Developer | React, Next.js", skills: ["React", "Next.js", "TypeScript", "TailwindCSS"] },
    { name: "Sadia Rahman", email: "sadia@gmail.com", headline: "Backend Engineer | Node.js, PostgreSQL", skills: ["Node.js", "PostgreSQL", "GraphQL"] },
    { name: "Imran Chowdhury", email: "imran@gmail.com", headline: "Full-stack Dev | Python, React", skills: ["Python", "Django", "React"] },
    { name: "Mahmuda Akter", email: "mahmuda@gmail.com", headline: "DevOps Engineer | AWS, Docker, K8s", skills: ["AWS", "Docker", "Kubernetes"] },
    { name: "Arif Mahmud", email: "arif@gmail.com", headline: "Mobile Developer | React Native", skills: ["React", "TypeScript"] },
  ];
  const seekers = await Promise.all(
    seekerData.map((s) =>
      User.create({
        ...s,
        password: seekerPassword,
        role: "job_seeker",
        emailVerified: new Date(),
      })
    )
  );
  await Promise.all(
    seekers.map((u, i) =>
      Profile.create({
        userId: u._id,
        bio: `${seekerData[i].headline}. Open to new opportunities.`,
        headline: seekerData[i].headline,
        location: cities[i % cities.length],
        skills: seekerData[i].skills,
        experience: [
          {
            title: "Software Engineer",
            company: "Previous Co.",
            start: new Date("2022-01-01"),
            end: null,
            description: "Building production features end-to-end.",
          },
        ],
        education: [
          { degree: "BSc in CSE", institution: "SUST", year: 2024, gpa: 3.7 },
        ],
        portfolioUrl: "https://github.com/" + u.email.split("@")[0],
        githubUrl: "https://github.com/" + u.email.split("@")[0],
      })
    )
  );
  console.log("+ 5 job seekers + profiles");

  // Jobs
  const jobsData = [
    {
      employerId: emp1._id, companyId: pathao._id,
      title: "Senior Frontend Engineer",
      slug: "senior-frontend-engineer-pathao",
      description: "Join Pathao's super-app team to build features used by millions.\n\nYou'll work on rider onboarding, fare calculation UI, and driver dashboards.",
      requirements: ["4+ years React", "TypeScript", "Experience with mobile-first design"],
      responsibilities: ["Architect new features", "Mentor junior devs", "Own frontend performance"],
      skills: ["React", "Next.js", "TypeScript", "TailwindCSS"],
      jobType: "full_time", experienceLevel: "senior",
      salary: { min: 120000, max: 180000, currency: "BDT", negotiable: false },
      location: "Dhaka", isRemote: false,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp1._id, companyId: pathao._id,
      title: "Backend Engineer (Node.js)",
      slug: "backend-engineer-nodejs-pathao",
      description: "Build resilient APIs powering our logistics platform.",
      requirements: ["3+ years Node.js", "PostgreSQL", "Microservices experience"],
      responsibilities: ["Design RESTful APIs", "Optimize DB queries", "On-call rotation"],
      skills: ["Node.js", "PostgreSQL", "Redis"],
      jobType: "full_time", experienceLevel: "mid",
      salary: { min: 100000, max: 150000, currency: "BDT", negotiable: true },
      location: "Dhaka", isRemote: false,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp2._id, companyId: bs23._id,
      title: "Full-Stack Developer",
      slug: "fullstack-developer-bs23",
      description: "Work on enterprise client projects across web and mobile.",
      requirements: ["React + Node.js", "REST APIs", "Comfortable with client-facing work"],
      responsibilities: ["Build features across stack", "Code reviews", "Direct client communication"],
      skills: ["React", "Node.js", "TypeScript"],
      jobType: "full_time", experienceLevel: "mid",
      salary: { min: 90000, max: 130000, currency: "BDT", negotiable: false },
      location: "Dhaka", isRemote: false,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp2._id, companyId: bs23._id,
      title: "DevOps Engineer",
      slug: "devops-engineer-bs23",
      description: "Own CI/CD, monitoring, and infra for 50+ microservices.",
      requirements: ["AWS", "Kubernetes", "Terraform or Pulumi"],
      responsibilities: ["Build deployment pipelines", "On-call", "Cost optimization"],
      skills: ["AWS", "Docker", "Kubernetes"],
      jobType: "full_time", experienceLevel: "senior",
      salary: { min: 130000, max: 200000, currency: "BDT", negotiable: true },
      location: "Chattogram", isRemote: false,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp3._id, companyId: socket._id,
      title: "Open-Source Developer Advocate",
      slug: "developer-advocate-socket",
      description: "Build dev community around Socket's open-source libraries.",
      requirements: ["Strong written English", "Public OSS contributions", "Tech writing"],
      responsibilities: ["Write technical posts", "Speak at meetups", "Triage GitHub issues"],
      skills: ["Git", "TypeScript", "Figma"],
      jobType: "remote", experienceLevel: "mid",
      salary: { min: 80000, max: 120000, currency: "BDT", negotiable: false },
      location: "Remote", isRemote: true,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp1._id, companyId: pathao._id,
      title: "Junior Frontend Intern",
      slug: "junior-frontend-intern-pathao",
      description: "6-month internship working on Pathao's consumer apps.",
      requirements: ["HTML/CSS/JS fundamentals", "React basics"],
      responsibilities: ["Build UI components", "Fix bugs", "Pair with senior devs"],
      skills: ["React", "JavaScript"],
      jobType: "internship", experienceLevel: "entry",
      salary: { min: 15000, max: 25000, currency: "BDT", negotiable: false },
      location: "Dhaka", isRemote: false,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp2._id, companyId: bs23._id,
      title: "Python Backend Developer",
      slug: "python-backend-developer-bs23",
      description: "Build data pipelines for a fintech client.",
      requirements: ["Python", "FastAPI or Django", "PostgreSQL"],
      responsibilities: ["Design schemas", "Build ETL", "Write tests"],
      skills: ["Python", "FastAPI", "PostgreSQL"],
      jobType: "contract", experienceLevel: "mid",
      salary: { min: 110000, max: 160000, currency: "BDT", negotiable: true },
      location: "Remote", isRemote: true,
      status: "active", publishedAt: new Date(),
    },
    {
      employerId: emp3._id, companyId: socket._id,
      title: "Lead Platform Engineer",
      slug: "lead-platform-engineer-socket",
      description: "Lead a small team building Socket's core platform.",
      requirements: ["7+ years backend", "Team leadership", "Distributed systems"],
      responsibilities: ["Set technical direction", "Hire engineers", "Own uptime"],
      skills: ["Go", "Rust", "Kubernetes"],
      jobType: "full_time", experienceLevel: "lead",
      salary: { min: 250000, max: 400000, currency: "BDT", negotiable: true },
      location: "Remote", isRemote: true,
      status: "pending_review",
    },
  ];
  const jobs = await Job.insertMany(jobsData);
  console.log(`+ ${jobs.length} jobs`);

  // Applications
  const apps = await Application.insertMany([
    { jobId: jobs[0]._id, applicantId: seekers[0]._id, status: "shortlisted", coverLetter: "Excited about Pathao's growth. 5 years React." },
    { jobId: jobs[1]._id, applicantId: seekers[1]._id, status: "pending", coverLetter: "Node + PostgreSQL expert. Available immediately." },
    { jobId: jobs[5]._id, applicantId: seekers[0]._id, status: "reviewing", coverLetter: "Final year SUST student, looking for internship." },
    { jobId: jobs[2]._id, applicantId: seekers[2]._id, status: "interview", coverLetter: "Full-stack dev with 3 years experience." },
    { jobId: jobs[3]._id, applicantId: seekers[3]._id, status: "pending", coverLetter: "DevOps engineer, AWS certified." },
  ]);
  console.log(`+ ${apps.length} applications`);

  // Saved jobs
  await SavedJob.insertMany([
    { userId: seekers[0]._id, jobId: jobs[4]._id },
    { userId: seekers[0]._id, jobId: jobs[6]._id },
    { userId: seekers[1]._id, jobId: jobs[7]._id },
  ]);
  console.log("+ 3 saved jobs");

  // Notifications
  await Notification.insertMany([
    { userId: seekers[0]._id, type: "application_status", title: "You were shortlisted", body: `Pathao responded to your application for ${jobs[0].title}.`, link: "/dashboard/applications", read: false },
    { userId: seekers[2]._id, type: "application_status", title: "Interview scheduled", body: `Brain Station 23 wants to interview you for ${jobs[2].title}.`, link: "/dashboard/applications", read: false },
    { userId: emp1._id, type: "new_message", title: "New message from Tanvir", body: "Thanks for the update!", link: "/dashboard/messages", read: true },
  ]);
  console.log("+ 3 notifications");

  // One conversation with a couple messages
  const conv = await Conversation.create({
    participants: [emp1._id, seekers[0]._id],
    jobId: jobs[0]._id,
    lastMessageAt: new Date(),
    lastMessagePreview: "Looking forward to the chat.",
    unreadBy: { [seekers[0]._id]: 0 },
  });
  await Message.insertMany([
    { conversationId: conv._id, senderId: emp1._id, body: "Hi Tanvir, we'd love to schedule a call this week." },
    { conversationId: conv._id, senderId: seekers[0]._id, body: "Looking forward to the chat." },
  ]);
  console.log("+ 1 conversation + 2 messages");

  console.log("\n✅ Seed complete.\n");
  console.log("Test accounts (password is role + 123):");
  console.log("  admin@techhire.bd       (password: admin123)");
  console.log("  faisal@pathao.com       (employer)");
  console.log("  tanvir@gmail.com        (seeker)");
  console.log("  nadia@brainstation23.com (employer)");
  console.log("  sadia@gmail.com         (seeker)");
  console.log("  rashid@socketinc.com    (employer, unverified)");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});