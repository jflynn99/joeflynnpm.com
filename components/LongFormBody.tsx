import type { ReactNode } from "react";
import { literata } from "./longFormFont";
import styles from "./LongFormBody.module.css";

/**
 * Wrapper for the MDX body of a post, project, or book review. Every
 * long-form page type uses this so they all read the same.
 */
export function LongFormBody({ children }: { children: ReactNode }) {
  return (
    <div className={`${literata.variable} ${styles.body} prose prose-lg max-w-none`}>
      {children}
    </div>
  );
}
