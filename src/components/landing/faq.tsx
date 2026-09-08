'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '@/config/faq';

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-y border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Questions fréquentes</h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                  aria-expanded={isOpen}
                >
                  {item.question}
                  <span className="ml-4 text-muted-foreground">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="px-5 pb-4 text-sm text-muted-foreground">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
