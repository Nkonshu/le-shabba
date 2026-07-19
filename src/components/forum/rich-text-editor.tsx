"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslations } from "next-intl";
import {
  TextB,
  TextItalic,
  TextUnderline,
  Quotes,
  Code,
  CodeBlock,
  ListBullets,
  ListNumbers,
  LinkSimple,
  ArrowUUpLeft,
  ArrowUUpRight,
} from "@phosphor-icons/react";

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg disabled:opacity-30 ${
        active ? "bg-neutral-100 text-accent-blue dark:bg-neutral-800" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}

// Éditeur riche façon Stack Overflow, réservé aux sujets/propositions (jamais aux commentaires,
// volontairement gardés en texte brut — même logique que SO). Stocke du HTML ; l'affichage passe
// systématiquement par <SafeHtml> pour l'assainir avant rendu (voir ce composant).
export function RichTextEditor({
  content,
  onChange,
  placeholder,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const t = useTranslations("forum");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: "rich-content min-h-[150px] px-3 py-2 focus:outline-none text-sm" },
    },
  });

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("linkPrompt"), previousUrl ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 p-1 dark:border-neutral-900">
        <ToolbarButton label={t("formatBold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <TextB size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatItalic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <TextItalic size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatUnderline")} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <TextUnderline size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatQuote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quotes size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatCode")} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatCodeBlock")} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <CodeBlock size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatBulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListBullets size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatOrderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListNumbers size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatLink")} active={editor.isActive("link")} onClick={setLink}>
          <LinkSimple size={15} />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
        <ToolbarButton label={t("formatUndo")} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <ArrowUUpLeft size={15} />
        </ToolbarButton>
        <ToolbarButton label={t("formatRedo")} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <ArrowUUpRight size={15} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
