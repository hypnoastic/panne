import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadApi } from '../services/api';
import Button from './Button';
import './RichEditor.css';

// Custom FontSize extension
import { Extension } from '@tiptap/core';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

export default function RichEditor({ content, onChange, placeholder = "Start writing..." }) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showAIPopup, setShowAIPopup] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiPopupPosition, setAiPopupPosition] = useState({ top: '50%' });
  const [currentContext, setCurrentContext] = useState('');
  const fileInputRef = useRef(null);

  const uploadImageMutation = useMutation({
    mutationFn: uploadApi.image,
    onSuccess: (data) => {
      editor?.chain().focus().setImage({ src: data.url }).run();
    }
  });

  const aiEditMutation = useMutation({
    mutationFn: async ({ message, context }) => {
      const prompt = `You are an AI editor. Edit the provided text according to the user's instructions. Return ONLY the edited text, no explanations or additional text.\n\nOriginal text: ${context}\n\nEdit instruction: ${message}\n\nEdited text:`;
      
      const response = await fetch('http://localhost:5000/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) throw new Error('AI request failed');
      return response.json();
    },
    onMutate: () => {
      setIsAiProcessing(true);
    },
    onSuccess: (response) => {
      const aiResponse = response.response || response.message;
      
      const hasSelection = editor?.state.selection.from !== editor?.state.selection.to;
      if (hasSelection) {
        editor?.chain().focus().deleteSelection().insertContent(aiResponse).run();
      } else {
        editor?.chain().focus().selectAll().insertContent(aiResponse).run();
      }
      
      setAiInput('');
      setShowAIPopup(false);
      setIsAiProcessing(false);
    },
    onError: () => {
      setIsAiProcessing(false);
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      TextStyle,
      FontSize,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
  }, [uploadImageMutation]);

  const handleAddLink = useCallback(() => {
    if (linkUrl) {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkModal(false);
    }
  }, [editor, linkUrl]);

  const handleInsertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
    setShowTableModal(false);
  }, [editor, tableRows, tableCols]);

  const getCaretPosition = useCallback(() => {
    if (!editor) return { top: '50%' };
    
    const { view } = editor;
    const { from } = view.state.selection;
    const start = view.coordsAtPos(from);
    const editorRect = view.dom.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const popupHeight = 60;
    
    let top = start.bottom - editorRect.top + 10;
    
    // If popup would go below viewport, position above cursor
    if (start.bottom + popupHeight > viewportHeight) {
      top = start.top - editorRect.top - popupHeight - 10;
    }
    
    // Ensure popup stays within editor bounds
    top = Math.max(10, Math.min(top, editorRect.height - popupHeight - 10));
    
    return { top: `${top}px` };
  }, [editor]);

  const handleOpenAI = useCallback(() => {
    const selectedText = editor?.state.doc.textBetween(
      editor?.state.selection.from,
      editor?.state.selection.to
    ) || editor?.getText() || '';
    
    setCurrentContext(selectedText);
    setAiInput('');
    setAiPopupPosition(getCaretPosition());
    setShowAIPopup(true);
  }, [editor, getCaretPosition]);

  const handleAISend = useCallback(() => {
    if (!aiInput.trim()) return;
    
    aiEditMutation.mutate({
      message: aiInput,
      context: currentContext
    });
  }, [aiInput, currentContext, aiEditMutation]);

  // Close popup on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAIPopup && !event.target.closest('.ai-popup')) {
        setShowAIPopup(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && showAIPopup) {
        setShowAIPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAIPopup]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-editor">
      {/* Bubble Menu for selected text */}
      <BubbleMenu className="bubble-menu" tippyOptions={{ duration: 100 }} editor={editor}>
        <div className="bubble-menu__content">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'is-active' : ''}
            title="Highlight"
          >
            H
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
            className={editor.isActive('link') ? 'is-active' : ''}
            title="Add Link"
          >
            Link
          </button>

        </div>
      </BubbleMenu>

      {/* Floating Menu for empty lines */}
      <FloatingMenu className="floating-menu" tippyOptions={{ duration: 100 }} editor={editor}>
        <div className="floating-menu__content">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
          >
            •
          </button>
          <button onClick={() => fileInputRef.current?.click()}>
            IMG
          </button>
        </div>
      </FloatingMenu>

      {/* Main Toolbar */}
      <div className="editor-toolbar">
        {/* Text Formatting */}
        <div className="toolbar-group">
          <select
            className="font-family-select"
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setFontFamily(e.target.value).run();
              } else {
                editor.chain().focus().unsetFontFamily().run();
              }
            }}
          >
            <option value="">Font Family</option>
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
          </select>

          <select
            className="font-size-select"
            onChange={(e) => {
              if (e.target.value) {
                editor.chain().focus().setFontSize(e.target.value).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
          >
            <option value="">Size</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="48px">48px</option>
          </select>
        </div>

        {/* Basic Formatting */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'is-active' : ''}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Colors */}
        <div className="toolbar-group">
          <input
            type="color"
            onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            title="Text Color"
            className="color-picker"
          />
          <input
            type="color"
            onInput={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            title="Highlight Color"
            className="color-picker"
          />
        </div>

        {/* Alignment */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
            title="Align Left"
          >
            ←
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
            title="Align Center"
          >
            ↔
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
            title="Align Right"
          >
            →
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
            title="Justify"
          >
            ≡
          </button>
        </div>

        {/* Lists */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Numbered List"
          >
            1. List
          </button>
        </div>

        {/* Insert Elements */}
        <div className="toolbar-group">
          <button
            onClick={() => setShowLinkModal(true)}
            className={editor.isActive('link') ? 'is-active' : ''}
            title="Insert Link"
          >
            Link
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Insert Image"
            disabled={uploadImageMutation.isPending}
          >
            {uploadImageMutation.isPending ? '...' : 'IMG'}
          </button>
          <button
            onClick={() => setShowTableModal(true)}
            title="Insert Table"
          >
            Table
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Insert Divider"
          >
            ─ Divider
          </button>
        </div>

        {/* Block Elements */}
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote"
          >
            " Quote
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            title="Code Block"
          >
            Code
          </button>
        </div>

        {/* AI Assistant */}
        <div className="toolbar-group">
          <button
            onClick={handleOpenAI}
            className="ai-button"
            title="AI Assistant"
          >
            ✦ AI
          </button>
        </div>


      </div>

      {/* Editor Content */}
      <div className="editor-content-wrapper">
        <EditorContent editor={editor} className="editor-content" />

        {/* AI Popup */}
        {showAIPopup && (
          <div 
            className="ai-popup"
            style={aiPopupPosition}
          >
            <div className="ai-popup-content">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="How should I edit this?"
                className="ai-popup-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAISend()}
                autoFocus
                disabled={isAiProcessing}
              />
              <button 
                className="ai-popup-send"
                onClick={handleAISend}
                disabled={!aiInput.trim() || isAiProcessing}
              >
                {isAiProcessing ? '...' : '→'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Add Link</h3>
              <button className="modal__close" onClick={() => setShowLinkModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <input
                type="url"
                placeholder="Enter URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="link-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <div className="modal__actions">
                <Button onClick={handleAddLink}>Add Link</Button>
                <Button variant="ghost" onClick={() => setShowLinkModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="modal-overlay" onClick={() => setShowTableModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Insert Table</h3>
              <button className="modal__close" onClick={() => setShowTableModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="table-config">
                <label>
                  Rows: 
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableRows}
                    onChange={(e) => setTableRows(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  Columns: 
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableCols}
                    onChange={(e) => setTableCols(parseInt(e.target.value))}
                  />
                </label>
              </div>
              <div className="modal__actions">
                <Button onClick={handleInsertTable}>Insert Table</Button>
                <Button variant="ghost" onClick={() => setShowTableModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}