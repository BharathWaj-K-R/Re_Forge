function CodeEditor({ code, onChange }) {
  return (
    <div className="code-editor">
      <label htmlFor="code">Source Code</label>
      <textarea
        id="code"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your source code here..."
        spellCheck={false}
      />
    </div>
  );
}

export default CodeEditor;
