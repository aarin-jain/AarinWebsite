"use client";

import { FormEvent, useEffect, useState } from "react";
import { NowPlayingBanner } from "./now-playing-banner";

const experience = [
  {
    number: "01",
    company: "Amazon",
    role: "Software Development Engineer",
    team: "Financial Technology",
    period: "2026 — Present",
    description: "Building scalable AWS data systems, reconciliation workflows, and AI-assisted tools for financial technology.",
  },
  {
    number: "02",
    company: "NCR Voyix",
    role: "Software Engineer Intern",
    team: "Retail Technology",
    period: "Summer 2024",
    description: "Built a responsive React dashboard and reusable widgets for visualizing retail loyalty data across microservices.",
  },
  {
    number: "03",
    company: "Gas South",
    role: "Data Analytics Intern",
    team: "Operations Analytics",
    period: "Spring 2024",
    description: "Used Python, R, SQL, and Power BI to turn customer and enrollment data into operational decisions.",
  },
  {
    number: "04",
    company: "Republic National Distributing Company",
    role: "Data Engineering Intern",
    team: "Data Analytics",
    period: "Summer 2023",
    description: "Developed forecasting dashboards and data interfaces connecting warehouse systems across 40+ locations.",
  },
];

const capabilities = [
  ["01", "Software engineering", "Designing reliable full-stack systems with Java, Python, JavaScript, TypeScript, SQL, React, and AWS."],
  ["02", "Applied AI & data", "Building practical machine-learning, analytics, and automation workflows that turn complex data into useful outcomes."],
  ["03", "Technical leadership", "Making difficult ideas approachable through clear documentation, collaboration, and experience teaching computer science."],
];

export function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in-view")),
      { threshold: 0.14 },
    );
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("sending");
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      formElement.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main>
      <NowPlayingBanner />
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Aarin Jain, home">AJ<span>.</span></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="navigation-links">
          {menuOpen ? "Close" : "Menu"}
        </button>
        <div id="navigation-links" className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#work" onClick={() => setMenuOpen(false)}>Work</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/writing" onClick={() => setMenuOpen(false)}>Writing</a>
          <a href="/listening" onClick={() => setMenuOpen(false)}>Listening</a>
          <a href="/play" onClick={() => setMenuOpen(false)}>Play</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </div>
        <a className="availability" href="#contact"><i /> Software engineer at Amazon</a>
      </nav>

      <section className="hero shell reveal in-view" id="top">
        <span className="vertical-mark" aria-hidden="true">デザイン・開発・好奇心</span>
        <p className="eyebrow">Software Engineer × AI × Data</p>
        <h1>I build systems<br />that make <em>sense.</em></h1>
        <div className="hero-bottom">
          <p>I’m Aarin, a software engineer at Amazon and Georgia Tech computer science graduate. I build reliable products at the intersection of cloud systems, data, and applied AI.</p>
          <a className="round-link" href="#work" aria-label="Explore selected work">↓</a>
        </div>
        <div className="ticker" aria-hidden="true"><span>Engineering</span><b>✦</b><span>Cloud</span><b>✦</b><span>Applied AI</span><b>✦</b><span>Curiosity</span></div>
      </section>

      <section className="work shell reveal" id="work">
        <div className="section-heading">
          <div><p className="eyebrow">Experience</p><h2>Learning by<br />building at scale.</h2></div>
          <p className="section-note">Experience across financial technology, retail software, analytics, and data engineering.</p>
        </div>
        <div className="experience-list">
          {experience.map((item) => (
            <article className="experience-row reveal" key={item.company}>
              <span>{item.number}</span>
              <div><p>{item.period}</p><h3>{item.company}</h3><p>{item.role} · {item.team}</p></div>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about reveal" id="about">
        <div className="shell about-inner">
          <p className="eyebrow">How I work · 方法</p>
          <h2>Engineering with<br />context and <em>care.</em></h2>
          <div className="capabilities">
            {capabilities.map(([number, title, copy]) => (
              <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
          <div className="about-story">
            <p>Georgia Tech CS, Intelligence & Theory. Now based in Bellevue, Washington.</p>
            <p>I’ve worked across financial technology, retail platforms, operations analytics, and data engineering. I’m most interested in systems that make complex work clearer, faster, and more dependable.</p>
          </div>
        </div>
      </section>

      <section className="contact shell reveal" id="contact">
        <div className="contact-intro"><p className="eyebrow">Start a conversation</p><h2>Let’s talk<br />technology.</h2><p>The easiest way to reach me is <a className="text-link" href="mailto:aarinj@gmail.com">aarinj@gmail.com</a>. I read every note and usually reply within two working days.</p></div>
        <form onSubmit={submitContact}>
          <label>Name<input name="name" autoComplete="name" required placeholder="Your name" /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label>What are you working on?<textarea name="message" required minLength={10} rows={4} placeholder="A product, a new venture, an interesting challenge…" /></label>
          <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send a note ↗"}</button>
          <p className="form-status" role="status">{status === "sent" ? "Thanks—your note is safely in my inbox." : status === "error" ? "Something went wrong. Please try again." : ""}</p>
        </form>
      </section>

      <footer className="shell"><a className="brand" href="#top">AJ<span>.</span></a><p>© {new Date().getFullYear()} Aarin Jain</p><div><a href="mailto:aarinj@gmail.com">Email</a><a href="https://www.linkedin.com/in/aarin-jain" target="_blank" rel="noreferrer">LinkedIn</a></div></footer>
    </main>
  );
}
