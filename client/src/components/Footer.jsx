import { Database, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-8 pt-5 border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-text-muted">
        <p className="flex items-center gap-1.5">
          <Database className="w-3 h-3" />
          Veri kaynağı:{' '}
          <a
            href="https://titck.gov.tr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent transition-colors inline-flex items-center gap-0.5"
          >
            TİTCK <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
        <p>
          <a
            href="https://github.com/ahmetyigits/ilac360"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors inline-flex items-center gap-1"
          >
            <Github className="w-3 h-3" /> GitHub&apos;da aç
          </a>
        </p>
      </div>
    </footer>
  );
}
