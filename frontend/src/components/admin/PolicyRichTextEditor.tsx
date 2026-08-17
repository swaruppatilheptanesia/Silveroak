import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Pilcrow, Type, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasPolicyRichTextContent, sanitizePolicyRichTextHtml } from '@/lib/policyModule';
import { cn } from '@/lib/utils';

type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEditorHtml(value: string) {
  if (!value) return '';
  if (hasPolicyRichTextContent(value)) {
    return sanitizePolicyRichTextHtml(value);
  }
  return escapeHtml(value).replace(/\n/g, '<br>');
}

export function PolicyRichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    const editorHtml = getEditorHtml(value);
    if (!editor || document.activeElement === editor || editor.innerHTML === editorHtml) {
      return;
    }
    editor.innerHTML = editorHtml;
  }, [value]);

  function emitChange() {
    onChange(sanitizePolicyRichTextHtml(editorRef.current?.innerHTML ?? ''));
  }

  function runCommand(command: RichTextCommand, commandValue?: string) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function formatBlock(tagName: 'p' | 'h2' | 'h3') {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tagName);
    emitChange();
  }

  const toolbar = [
    { label: 'Bold', icon: Bold, action: () => runCommand('bold') },
    { label: 'Italic', icon: Italic, action: () => runCommand('italic') },
    { label: 'Underline', icon: Underline, action: () => runCommand('underline') },
    { label: 'Bulleted list', icon: List, action: () => runCommand('insertUnorderedList') },
    { label: 'Numbered list', icon: ListOrdered, action: () => runCommand('insertOrderedList') },
    { label: 'Heading', icon: Type, action: () => formatBlock('h2') },
    { label: 'Paragraph', icon: Pilcrow, action: () => formatBlock('p') },
  ];

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-2">
        {toolbar.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={item.action}
            disabled={disabled}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
            <span className="sr-only">{item.label}</span>
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={cn(
          'min-h-[260px] px-3 py-2 text-sm outline-none',
          'empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
    </div>
  );
}
