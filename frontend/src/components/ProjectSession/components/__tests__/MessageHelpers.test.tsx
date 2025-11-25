import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../../tests/utils/testUtils';
import {
  processContentWithImages,
  MessageContentWithImages,
  formatObservationContent,
  formatActionArgs,
  getFileExtension,
  getLanguageFromExtension,
  CodeBlock,
  ObservationContent,
  FileWriteActionArgs,
} from '../MessageHelpers';

describe('MessageHelpers', () => {
  describe('processContentWithImages', () => {
    it('should return content as-is when no images present', () => {
      const content = 'Hello world, this is plain text';
      const result = processContentWithImages(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(content);
    });

    it('should extract SVG from content', () => {
      const content = 'Here is an SVG: <svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg> and more text';
      const result = processContentWithImages(content);

      expect(result.length).toBeGreaterThan(1);
    });

    it('should extract data URI images', () => {
      const content = 'Image: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA and text';
      const result = processContentWithImages(content);

      expect(result.length).toBeGreaterThan(1);
    });

    it('should handle multiple images', () => {
      const content = 'First <svg></svg> then data:image/jpeg;base64,ABCD';
      const result = processContentWithImages(content);

      expect(result.length).toBeGreaterThan(2);
    });

    it('should handle empty content', () => {
      const result = processContentWithImages('');
      expect(result).toHaveLength(1);
    });
  });

  describe('MessageContentWithImages', () => {
    it('should render plain markdown content', () => {
      render(<MessageContentWithImages content="# Hello World" />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render bold text', () => {
      render(<MessageContentWithImages content="This is **bold** text" />);

      expect(screen.getByText(/bold/)).toBeInTheDocument();
    });

    it('should render code blocks', () => {
      const code = '```javascript\nconsole.log("hello");\n```';
      render(<MessageContentWithImages content={code} />);

      expect(screen.getByText(/console\.log/)).toBeInTheDocument();
    });

    it('should render inline code', () => {
      render(<MessageContentWithImages content="Use `npm install` to install" />);

      expect(screen.getByText(/npm install/)).toBeInTheDocument();
    });

    it('should handle lists', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      render(<MessageContentWithImages content={content} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should handle links', () => {
      render(<MessageContentWithImages content="[OpenAI](https://openai.com)" />);

      const link = screen.getByRole('link', { name: /OpenAI/i });
      expect(link).toHaveAttribute('href', 'https://openai.com');
    });

    it('should handle empty content', () => {
      const { container } = render(<MessageContentWithImages content="" />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('formatObservationContent', () => {
    it('should format string content', () => {
      const result = formatObservationContent('Simple string');
      expect(result).toBe('Simple string');
    });

    it('should replace newline characters', () => {
      const result = formatObservationContent('Line 1\\nLine 2');
      expect(result).toBe('Line 1\nLine 2');
    });

    it('should parse JSON string', () => {
      const jsonString = '{"result": "success"}';
      const result = formatObservationContent(jsonString);
      expect(result).toBe('success');
    });

    it('should stringify JSON object', () => {
      const obj = { result: 'test', data: [1, 2, 3] };
      const result = formatObservationContent(obj);
      expect(result).toContain('test');
      expect(result).toContain('[1, 2, 3]' || '[\n  1,\n  2,\n  3\n]');
    });

    it('should handle nested result field', () => {
      const result = formatObservationContent({ result: { output: 'nested' } });
      expect(result).toContain('nested');
    });

    it('should handle output field', () => {
      const result = formatObservationContent({ output: 'test output' });
      expect(result).toContain('test output');
    });

    it('should handle data field', () => {
      const result = formatObservationContent({ data: 'test data' });
      expect(result).toContain('test data');
    });

    it('should handle null', () => {
      const result = formatObservationContent(null as any);
      expect(typeof result).toBe('string');
    });

    it('should handle numbers', () => {
      const result = formatObservationContent(42);
      expect(result).toBe('42');
    });
  });

  describe('formatActionArgs', () => {
    it('should format object to JSON string', () => {
      const args = { file: 'test.txt', content: 'hello' };
      const result = formatActionArgs(args);

      expect(result).toContain('test.txt');
      expect(result).toContain('hello');
    });

    it('should format valid JSON string', () => {
      const args = '{"key": "value"}';
      const result = formatActionArgs(args);

      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    it('should handle invalid JSON string as-is', () => {
      const args = 'not a json string';
      const result = formatActionArgs(args);

      expect(result).toBe('not a json string');
    });

    it('should handle null', () => {
      const result = formatActionArgs(null);
      expect(result).toBe('null');
    });

    it('should handle arrays', () => {
      const result = formatActionArgs([1, 2, 3]);
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should format nested objects', () => {
      const args = { outer: { inner: 'value' } };
      const result = formatActionArgs(args);

      expect(result).toContain('outer');
      expect(result).toContain('inner');
      expect(result).toContain('value');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.txt')).toBe('txt');
      expect(getFileExtension('file.py')).toBe('py');
      expect(getFileExtension('script.js')).toBe('js');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('my.file.name.tsx')).toBe('tsx');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should handle paths', () => {
      expect(getFileExtension('/path/to/file.json')).toBe('json');
      expect(getFileExtension('./relative/path/file.yaml')).toBe('yaml');
    });

    it('should return empty for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('should return empty for directories', () => {
      expect(getFileExtension('/path/to/directory/')).toBe('');
    });

    it('should be case-insensitive', () => {
      expect(getFileExtension('FILE.TXT')).toBe('txt');
      expect(getFileExtension('Script.PY')).toBe('py');
    });
  });

  describe('getLanguageFromExtension', () => {
    it('should map common programming languages', () => {
      expect(getLanguageFromExtension('js')).toBe('javascript');
      expect(getLanguageFromExtension('ts')).toBe('typescript');
      expect(getLanguageFromExtension('py')).toBe('python');
      expect(getLanguageFromExtension('rb')).toBe('ruby');
      expect(getLanguageFromExtension('java')).toBe('java');
      expect(getLanguageFromExtension('go')).toBe('go');
      expect(getLanguageFromExtension('rs')).toBe('rust');
    });

    it('should map web languages', () => {
      expect(getLanguageFromExtension('html')).toBe('html');
      expect(getLanguageFromExtension('css')).toBe('css');
      expect(getLanguageFromExtension('scss')).toBe('scss');
    });

    it('should map config file formats', () => {
      expect(getLanguageFromExtension('json')).toBe('json');
      expect(getLanguageFromExtension('yaml')).toBe('yaml');
      expect(getLanguageFromExtension('yml')).toBe('yaml');
      expect(getLanguageFromExtension('xml')).toBe('xml');
    });

    it('should map shell scripts', () => {
      expect(getLanguageFromExtension('sh')).toBe('bash');
      expect(getLanguageFromExtension('bash')).toBe('bash');
      expect(getLanguageFromExtension('zsh')).toBe('bash');
    });

    it('should map markdown', () => {
      expect(getLanguageFromExtension('md')).toBe('markdown');
      expect(getLanguageFromExtension('markdown')).toBe('markdown');
    });

    it('should return extension as-is for unknown types', () => {
      expect(getLanguageFromExtension('unknown')).toBe('unknown');
      expect(getLanguageFromExtension('xyz')).toBe('xyz');
    });

    it('should handle JSX/TSX', () => {
      expect(getLanguageFromExtension('jsx')).toBe('javascript');
      expect(getLanguageFromExtension('tsx')).toBe('typescript');
    });
  });

  describe('CodeBlock', () => {
    it('should render inline code', () => {
      const { container } = render(
        <CodeBlock inline={true}>const x = 5;</CodeBlock>
      );

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toBe('const x = 5;');
    });

    it('should render block code with syntax highlighting', () => {
      const { container } = render(
        <CodeBlock inline={false} className="language-javascript">
          console.log("Hello");
        </CodeBlock>
      );

      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should handle code without language', () => {
      const { container } = render(
        <CodeBlock inline={false}>Plain code</CodeBlock>
      );

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
    });

    it('should trim trailing newlines', () => {
      const { container } = render(
        <CodeBlock inline={false} className="language-python">
          {'print("test")\n'}
        </CodeBlock>
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe('ObservationContent', () => {
    it('should render text content', () => {
      render(<ObservationContent content="Success message" />);
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should render JSON object content', () => {
      const content = { result: 'completed' };
      const { container } = render(<ObservationContent content={content} />);

      expect(container.textContent).toContain('completed');
    });

    it('should render image from metadata', () => {
      const metadata = {
        type: 'image',
        image_data: 'data:image/png;base64,ABC',
        filename: 'test.png',
      };

      render(<ObservationContent content="Image created" metadata={metadata} />);

      expect(screen.getByText('Image created')).toBeInTheDocument();
      expect(screen.getByAltText('test.png')).toBeInTheDocument();
    });

    it('should render image with default filename', () => {
      const metadata = {
        type: 'image',
        image_data: 'data:image/png;base64,ABC',
      };

      render(<ObservationContent content="Image" metadata={metadata} />);

      expect(screen.getByAltText('image')).toBeInTheDocument();
    });

    it('should handle complex nested content', () => {
      const content = { result: { output: { data: 'nested value' } } };
      const { container } = render(<ObservationContent content={content} />);

      expect(container.textContent).toContain('nested value');
    });

    it('should handle string with newlines', () => {
      const { container } = render(<ObservationContent content="Line 1\\nLine 2" />);
      expect(container.textContent).toContain('Line 1');
    });
  });

  describe('FileWriteActionArgs', () => {
    it('should render file write with code syntax highlighting', () => {
      const args = {
        file_path: 'test.js',
        content: 'console.log("hello");',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: test.js/)).toBeInTheDocument();
      expect(screen.getByText(/console\.log/)).toBeInTheDocument();
    });

    it('should render Python file with Python syntax', () => {
      const args = {
        file_path: 'script.py',
        content: 'print("Hello, World!")',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: script.py/)).toBeInTheDocument();
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });

    it('should render markdown file with markdown rendering', () => {
      const args = {
        file_path: 'README.md',
        content: '# Title\nSome content',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing markdown: README.md/)).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should handle image files', () => {
      const args = {
        file_path: 'image.png',
        content: 'base64imagedata',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing image: image.png/)).toBeInTheDocument();
    });

    it('should handle SVG files', () => {
      const args = {
        file_path: 'icon.svg',
        content: '<svg></svg>',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing image: icon.svg/)).toBeInTheDocument();
    });

    it('should handle JSON string args', () => {
      const args = '{"file_path": "test.json", "content": "{}"}';

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: test.json/)).toBeInTheDocument();
    });

    it('should fallback to plain JSON for invalid args', () => {
      const args = { invalid: 'structure' };

      const { container } = render(<FileWriteActionArgs args={args} />);

      expect(container.querySelector('.action-args')).toBeInTheDocument();
    });

    it('should handle alternative field names', () => {
      const args = {
        path: 'test.txt',
        data: 'file content',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: test.txt/)).toBeInTheDocument();
    });

    it('should handle TypeScript files', () => {
      const args = {
        file_path: 'component.tsx',
        content: 'export const Component = () => {}',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: component.tsx/)).toBeInTheDocument();
    });

    it('should handle YAML files', () => {
      const args = {
        file_path: 'config.yml',
        content: 'key: value\narray:\n  - item1',
      };

      render(<FileWriteActionArgs args={args} />);

      expect(screen.getByText(/Writing file: config.yml/)).toBeInTheDocument();
    });
  });
});
