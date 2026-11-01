import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Help" };

const QUESTIONS = [
  {
    question: "Why does a capability say “proficiency is not yet established”?",
    answer:
      "Because there is not enough attributable evidence to publish an estimate. RepuH treats that as a real state, not a zero. A zero would read as a judgement; the absence of evidence is not evidence of absence.",
  },
  {
    question: "What is the difference between an estimate and confidence?",
    answer:
      "The estimate is what the evidence supports on a 0–100 scale for one capability. Confidence describes how much the system trusts that number: how many independent items, how many projects, how many sources and how far the evidence spans. They are always reported separately and never combined into one overall score.",
  },
  {
    question: "Why is a merged pull request worth more than a commit?",
    answer:
      "A commit is activity. A merged pull request is a completed contribution that passed a review boundary. The ontology gives each signal a different weight because they support different claims. Volume alone never becomes proficiency — the scoring curve saturates.",
  },
  {
    question: "Does RepuH read my source code?",
    answer:
      "No. The GitHub integration reads metadata: repository name, declared language, topics, pull request titles and counts, review presence, issue outcomes and releases. Full source is not downloaded to compute a score.",
  },
  {
    question: "What does the DEMO badge mean?",
    answer:
      "The item came from the development adapter, not from a live provider. It exists so the product can be explored without credentials. Demo profiles are labelled everywhere and are never presented as real users.",
  },
  {
    question: "What happens when I revoke consent?",
    answer:
      "New synchronization stops immediately and the browser companion refuses to send events. Existing evidence remains until you remove it; account deletion removes everything.",
  },
  {
    question: "Is a blockchain anchor proof that I have a skill?",
    answer:
      "No. An anchor proves that a batch of commitments has not been altered since it was recorded. It says nothing about proficiency, employment or identity.",
  },
  {
    question: "Why is there no overall score?",
    answer:
      "Because a single number would collapse different capabilities, different evidence and different confidence into something the evidence cannot support. Compare per capability, with confidence visible.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-[62rem] space-y-8">
      <PageHeader
        title="Help"
        description="Plain answers about what the product measures, what it refuses to measure, and how to operate the controls."
      />

      <dl className="divide-y divide-border border-y border-border">
        {QUESTIONS.map((item) => (
          <div key={item.question} className="py-5">
            <dt className="text-[0.9375rem] font-medium">{item.question}</dt>
            <dd className="mt-1.5 max-w-[70ch] text-[0.8125rem] leading-relaxed text-muted">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>

      <section className="border-t border-border pt-6">
        <h2 className="text-[0.9375rem] font-medium">Operational guides</h2>
        <ul className="mt-3 grid gap-2 text-[0.8125rem] sm:grid-cols-2">
          {[
            ["Connect or disconnect GitHub", "/integrations"],
            ["Grant or revoke observation", "/settings#observation"],
            ["Export or delete your data", "/settings#security"],
            ["Anchor and verify evidence", "/settings#integrity"],
            ["Pair the Chrome extension", "/extension"],
            ["Read the implementation docs", "/docs"],
          ].map(([label, href]) => (
            <li key={href}>
              <Link href={href!} className="text-primary hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
