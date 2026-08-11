"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const projects = [
  {
    number: "01",
    title: "Signal",
    type: "Product design",
    description: "A calmer way for teams to turn scattered customer feedback into decisions.",
    tags: ["Next.js", "TypeScript", "AI"],
    className: "signal",
  },
  {
    number: "02",
    title: "Common Ground",
    type: "Brand & web",
    description: "A new digital home for a studio building climate-positive places.",
    tags: ["Strategy", "Identity", "Web"],
    className: "common",
  },
  {
    number: "03",
    title: "Pulse",
    type: "Full-stack app",
    description: "Private, lightweight habit tracking built for consistency—not streak anxiety.",
    tags: ["React", "Cloudflare", "D1"],
    className: "pulse",
  },
];

const capabilities = [
  ["01", "Product thinking", "Turning ambiguous ideas into a focused product, with a clear reason for every feature."],
  ["02", "Design systems", "Building expressive, reusable interfaces that stay coherent as products grow."],
  ["03", "Full-stack craft", "Taking products from first sketch to resilient, accessible, production-ready software."],
];

export function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("in-view")),
      { threshold: 0.14 },
    );
    elements.forEach((element) => observer.observe(element));

    const moveCursor = (event: PointerEvent) => {
      cursorRef.current?.style.setProperty("--x", `${event.clientX}px`);
      cursorRef.current?.style.setProperty("--y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", moveCursor);
    return () => { observer.disconnect(); window.removeEventListener("pointermove", moveCursor); };
  }, []);

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });

    if (response.ok) {
      event.currentTarget.reset();
      setStatus("sent");
    } else {
      setStatus("error");
    }
  }

  return (
    <main>
      <div className="cursor-orb" ref={cursorRef} aria-hidden="true" />
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Aarin Jain, home">AJ<span>.</span></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="navigation-links">
          {menuOpen ? "Close" : "Menu"}
        </button>
        <div id="navigation-links" className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#work" onClick={() => setMenuOpen(false)}>Work</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </div>
        <a className="availability" href="#contact"><i /> Available for select projects</a>
      </nav>

      <section className="hero shell reveal in-view" id="top">
        <span className="vertical-mark" aria-hidden="true">デザイン・開発・好奇心</span>
        <p className="eyebrow">Designer × Developer × Builder</p>
        <h1>I make digital<br />things feel <em>human.</em></h1>
        <div className="hero-bottom">
          <p>I’m Aarin—a product-minded designer and engineer creating useful, characterful experiences from first idea to final detail.</p>
          <a className="round-link" href="#work" aria-label="Explore selected work">↓</a>
        </div>
        <div className="ticker" aria-hidden="true"><span>Strategy</span><b>✦</b><span>Design</span><b>✦</b><span>Engineering</span><b>✦</b><span>Curiosity</span></div>
      </section>

      <section className="work shell reveal" id="work">
        <div className="section-heading">
          <div><p className="eyebrow">Selected work</p><h2>A few things I’m<br />proud to have made.</h2></div>
          <p className="section-note">Thoughtful products for ambitious teams, from zero-to-one ideas to systems used at scale.</p>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project reveal" key={project.title}>
              <div className={`project-visual ${project.className}`}>
                <span className="project-number">{project.number}</span>
                <div className="mockup"><div className="mockup-bar" /><div className="mockup-copy"><small>{project.type}</small><strong>{project.title}</strong><span /></div></div>
              </div>
              <div className="project-copy">
                <div><p>{project.type}</p><h3>{project.title}</h3></div>
                <p>{project.description}</p>
              </div>
              <div className="tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="about reveal" id="about">
        <div className="shell about-inner">
          <p className="eyebrow">How I work · 方法</p>
          <h2>Equal parts systems<br />thinking and <em>making.</em></h2>
          <div className="capabilities">
            {capabilities.map(([number, title, copy]) => (
              <article key={title}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
            ))}
          </div>
          <div className="about-story">
            <p>Based in California, working with good people everywhere.</p>
            <p>I care about the small things that make software feel obvious: the sentence that removes doubt, the motion that explains what changed, and the system that lets a team move faster.</p>
          </div>
        </div>
      </section>

      <section className="contact shell reveal" id="contact">
        <div className="contact-intro"><p className="eyebrow">Start a conversation</p><h2>Have a good<br />problem to solve?</h2><p>Tell me a little about it. I read every note and usually reply within two working days.</p></div>
        <form onSubmit={submitContact}>
          <label>Name<input name="name" autoComplete="name" required placeholder="Your name" /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
          <label>What are you working on?<textarea name="message" required minLength={10} rows={4} placeholder="A product, a new venture, an interesting challenge…" /></label>
          <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Send a note ↗"}</button>
          <p className="form-status" role="status">{status === "sent" ? "Thanks—your note is safely in my inbox." : status === "error" ? "Something went wrong. Please try again." : ""}</p>
        </form>
      </section>

      <footer className="shell"><a className="brand" href="#top">AJ<span>.</span></a><p>© {new Date().getFullYear()} Aarin Jain</p><div><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></div></footer>
    </main>
  );
}
