import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps a Google Maps failure (e.g. a key that isn't authorised for this
 * domain) from taking down the whole page. Everything else on the route —
 * address search, forms, listings — keeps working.
 */
export class MapErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Map failed to render:", error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-48 w-full items-center justify-center rounded-2xl border border-border bg-secondary/30 px-6 text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Map unavailable right now</p>
              <p className="mt-1 text-xs text-muted-foreground">
                You can continue — everything else on this page still works.
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
