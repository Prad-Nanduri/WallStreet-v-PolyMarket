"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class TableErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <tr>
          <td
            colSpan={6}
            className="border-t border-border-soft px-4 py-8 text-center text-sm text-muted"
          >
            Something went wrong rendering this table — try refreshing.
          </td>
        </tr>
      );
    }
    return this.props.children;
  }
}
