import { mergeAttributes, Node } from '@tiptap/core';
import mermaid from 'mermaid';

export default Node.create({
  name: 'mermaid',
  group: 'block',
  content: 'text*',
  code: true,
  defining: true,

  addAttributes() {
    return {
      language: {
        default: 'mermaid',
      },
    };
  },

  parseHTML() {
    // Parse the HTML blocks that are <div class="mermaid">
    return [
      {
        tag: 'div.mermaid',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'mermaid' }), 0];
  },

  // Add the node in the editor with mermaid rendering
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'mermaid';
      dom.innerHTML = node.textContent;
      const renderMermaid = async () => {
        try {
          mermaid.initialize({ startOnLoad: false });
          await mermaid.run({ nodes: [dom] });
        } catch (error) {
          console.error('Mermaid rendering error', error);
        }
      };
      renderMermaid();
      return {
        dom,
        update: (updatedNode) => {
          try {
            if (updatedNode.textContent !== node.textContent) {
              dom.innerHTML = updatedNode.textContent;
              renderMermaid();
            }
          } catch (error) {
            console.error('Mermaid update error', error);
          }
        },
      };
    };
  },
});
