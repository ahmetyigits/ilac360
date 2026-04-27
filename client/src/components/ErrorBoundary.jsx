import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (!import.meta.env.PROD) {
      console.error('ErrorBoundary caught:', error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-bg-primary">
          <div className="bg-card rounded-xl border border-border p-8 max-w-md text-center shadow-lg">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-risk-high" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Bir hata oluştu</h2>
            <p className="text-sm text-text-secondary mb-5">
              Uygulama beklenmeyen bir hatayla karşılaştı. Sayfayı yenileyerek tekrar deneyin.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Sayfayı Yenile
            </button>
            {this.state.error && (
              <p className="text-[11px] text-text-muted mt-4 font-mono bg-bg-primary rounded p-2 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
