const LANGUAGES = [
  'Java',
  'Python',
  'C',
  'C++',
  'JavaScript',
];

function LanguageSelector({ language, onChange }) {
  return (
    <div className="language-selector">
      <label htmlFor="language">Language</label>
      <select
        id="language"
        value={language}
        onChange={(e) => onChange(e.target.value)}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
