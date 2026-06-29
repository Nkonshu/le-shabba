"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { 
  Bold, Italic, List, ListOrdered, 
  Type, Quote, Undo, Redo, Sigma
} from "lucide-react";

interface TiptapEditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const toggleButton = (fn: () => void, isActive: boolean) => (
    <button
      type="button"
      onClick={fn}
      className={`p-2 rounded-md transition-colors ${
        isActive ? "bg-black text-white" : "text-[#757575] hover:bg-gray-100"
      }`}
    >
      {/* Voir plus bas pour les icônes */}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#E0E0E0] bg-gray-50/50 rounded-t-2xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded ${editor.isActive("bold") ? "bg-black text-white" : "hover:bg-gray-200"}`}
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded ${editor.isActive("italic") ? "bg-black text-white" : "hover:bg-gray-200"}`}
      >
        <Italic size={16} />
      </button>
      <div className="w-[1px] bg-[#E0E0E0] mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded ${editor.isActive("bulletList") ? "bg-black text-white" : "hover:bg-gray-200"}`}
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded ${editor.isActive("orderedList") ? "bg-black text-white" : "hover:bg-gray-200"}`}
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-[1px] bg-[#E0E0E0] mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded ${editor.isActive("blockquote") ? "bg-black text-white" : "hover:bg-gray-200"}`}
      >
        <Quote size={16} />
      </button>
      <button
        type="button"
        className="p-1.5 rounded hover:bg-gray-200 text-blue-600"
        onClick={() => {
            const formula = prompt("Entrez votre formule LaTeX (ex: E=mc^2)");
            if (formula) editor.chain().focus().insertContent(` $${formula}$ `).run();
        }}
      >
        <Sigma size={16} />
      </button>
    </div>
  );
};

export default function TiptapEditor({ onChange, initialContent = "" }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none max-w-full p-4 min-h-[150px] cursor-text",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="w-full border-2 border-transparent bg-gray-50 rounded-2xl focus-within:border-black transition-all overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}