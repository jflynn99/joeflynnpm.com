"use client";

import { useState } from "react";

// Answers longer than this start folded, so twenty of them do not bury the page.
const FOLD_AT = 420;

interface EchoAnswerProps {
  answer: string;
  cutOff: boolean;
  maxTokens: number;
}

/**
 * One answer, shown exactly as the model produced it: no markdown, no
 * trimming, line breaks kept. Long answers fold to six lines with a button.
 */
export function EchoAnswer({ answer, cutOff, maxTokens }: EchoAnswerProps) {
  const long = answer.length > FOLD_AT;
  const [open, setOpen] = useState(false);

  return (
    <div>
      {answer === "" ? (
        <p className="italic text-muted">(she said nothing)</p>
      ) : (
        <p
          className={`whitespace-pre-wrap break-words leading-7 ${long && !open ? "line-clamp-6" : ""}`}
        >
          {answer}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {long && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            {open ? "Show less" : "Show the whole answer"}
          </button>
        )}
        {cutOff && (!long || open) && <span>Cut off at the {maxTokens}-token limit.</span>}
      </div>
    </div>
  );
}
