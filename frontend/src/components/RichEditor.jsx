import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { uploadApi, aiApi } from '../services/api';
import Button from './Button';
import './RichEditor.css';

export default function RichEditor({ content, onChange, placeholder = "Start writing..." }) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMode, setAiMode] = useState('ask');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [currentContext, setCurrentContext] = useState('');
  const fileInputRef = useRef(null);

  const uploadImageMutation = useMutation({
    mutationFn: uploadApi.image,
    onSuccess: (data) => {
      editor?.chain().focus().setImage({ src: data.url }).run();
    }
  });

  const aiChatMutation = useMutation({
    mutationFn: async ({ message, mode, context }) => {
      let prompt;
      if (mode === 'ask') {
        prompt = `You are a helpful AI assistant. Answer the user's question about their note content.

Note content: ${context}

User question: ${message}

Provide a helpful and informative response.`;
      } else {
        prompt = `You are an AI editor. Edit the provided text according to the user's instructions. Return ONLY the edited text, no explanations or additional text.

Original text: ${context}

Edit instruction: ${message}

Edited text:`;
      }
      
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
      setIsAiTyping(true);
      setAiMessages(prev => [...prev, { type: 'user', content: aiInput }]);
    },
    onSuccess: (response) => {
      const aiResponse = response.response || response.message;
      setAiMessages(prev => [...prev, { type: 'ai', content: aiResponse }]);
      
      if (aiMode === 'edit') {
        // For edit mode, replace the content in the editor
        const hasSelection = editor?.state.selection.from !== editor?.state.selection.to;
        if (hasSelection) {
          editor?.chain().focus().deleteSelection().insertContent(aiResponse).run();
        } else {
          editor?.chain().focus().selectAll().insertContent(aiResponse).run();
        }
      }
      
      setAiInput('');
      setIsAiTyping(false);
    },
    onError: () => {
      setAiMessages(prev => [...prev, { type: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
      setIsAiTyping(false);
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
  };

  const handleAISend = () => {
    if (!aiInput.trim()) return;
    
    aiChatMutation.mutate({
      message: aiInput,
      mode: aiMode,
      context: currentContext
    });
  };

  const handleOpenAI = () => {
    const selectedText = editor?.state.doc.textBetween(
      editor?.state.selection.from,
      editor?.state.selection.to
    ) || editor?.getText() || '';
    
    setCurrentContext(selectedText);
    setAiMessages([]);
    setAiInput('');
    setShowAIModal(true);
  };



  const slashCommands = [
    { label: 'Heading 1', command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), icon: 'H1' },
    { label: 'Heading 2', command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: 'H2' },
    { label: 'Heading 3', command: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), icon: 'H3' },
    { label: 'Bullet List', command: () => editor.chain().focus().toggleBulletList().run(), icon: '•' },
    { label: 'Numbered List', command: () => editor.chain().focus().toggleOrderedList().run(), icon: '1.' },
    { label: 'Quote', command: () => editor.chain().focus().toggleBlockquote().run(), icon: '"' },
    { label: 'Code Block', command: () => editor.chain().focus().toggleCodeBlock().run(), icon: '</>' },
    { label: 'Image', command: () => fileInputRef.current?.click(), icon: '🖼️' },
    { label: 'Divider', command: () => editor.chain().focus().setHorizontalRule().run(), icon: '—' },
  ];

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-editor">
      {editor && (
        <BubbleMenu
          className="bubble-menu"
          tippyOptions={{ duration: 100 }}
          editor={editor}
        >
          <div className="bubble-menu__content">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
            >
              B
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
            >
              I
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
            >
              S
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={editor.isActive('highlight') ? 'is-active' : ''}
            >
              H
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenAI}
            >
              ✨
            </Button>
          </div>
        </BubbleMenu>
      )}

      <div className="editor-toolbar">
        <div className="toolbar-group">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            Bold
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            Italic
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
          >
            Strike
          </Button>
        </div>
        
        <div className="toolbar-group">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const { from, to } = editor.state.selection;
              if (from === to) {
                editor.chain().focus().setHeading({ level: 1 }).run();
              } else {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
              }
            }}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          >
            H1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const { from, to } = editor.state.selection;
              if (from === to) {
                editor.chain().focus().setHeading({ level: 2 }).run();
              } else {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
              }
            }}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          >
            H2
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
          >
            List
          </Button>
        </div>

        <div className="toolbar-group">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
          >
            Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
          >
            Quote
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            loading={uploadImageMutation.isPending}
          >
            Image
          </Button>
        </div>

        <div className="toolbar-group">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenAI}
          >
            ✨ AI
          </Button>
        </div>
      </div>

      <EditorContent 
        editor={editor} 
        className="editor-content"
        placeholder={placeholder}
      />

      {showSlashMenu && (
        <div 
          className="slash-menu"
          style={{ 
            position: 'absolute',
            left: slashMenuPosition.x,
            top: slashMenuPosition.y 
          }}
        >
          {slashCommands.map((command, index) => (
            <button
              key={index}
              className="slash-menu__item"
              onClick={() => {
                command.command();
                setShowSlashMenu(false);
              }}
            >
              <span className="slash-menu__icon">{command.icon}</span>
              <span className="slash-menu__label">{command.label}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {showAIModal && (
        <div className="modal-overlay" onClick={() => setShowAIModal(false)}>
          <div className="modal ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>AI Assistant</h3>
              <button className="modal__close" onClick={() => setShowAIModal(false)}>×</button>
            </div>
            <div className="modal__content">
              <div className="ai-mode-selector">
                <button 
                  className={`ai-mode-button ${aiMode === 'ask' ? 'active' : ''}`}
                  onClick={() => setAiMode('ask')}
                >
                  Ask
                </button>
                <button 
                  className={`ai-mode-button ${aiMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setAiMode('edit')}
                >
                  Edit
                </button>
              </div>
              
              {currentContext && (
                <div className="ai-context-info">
                  {editor?.state.selection.from !== editor?.state.selection.to 
                    ? `Working with selected text: "${currentContext.substring(0, 100)}${currentContext.length > 100 ? '...' : ''}"`
                    : 'Working with full note content'
                  }
                </div>
              )}
              
              <div className="ai-chat-container">
                <div className="ai-messages">
                  {aiMessages.map((message, index) => (
                    <div key={index} className={`ai-message ${message.type}`}>
                      {message.content}
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="ai-message ai">
                      <div className="ai-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="ai-input-container">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={aiMode === 'ask' ? 'Ask about your note...' : 'How should I edit this?'}
                    className="ai-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAISend()}
                  />
                  <Button onClick={handleAISend} loading={aiChatMutation.isPending}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}