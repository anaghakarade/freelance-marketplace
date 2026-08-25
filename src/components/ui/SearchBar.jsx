import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Button from './Button';

const SearchBar = ({
  placeholder = 'What service are you looking for today?',
  onSearch,
  initialValue = '',
  className = '',
}) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-xs ${className}`}
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-bg-base)',
        padding: '2px 2px 2px var(--space-sm)',
        width: '100%',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Search size={18} style={{ color: 'var(--color-text-light)' }} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-family)',
          color: 'var(--color-text-main)',
          padding: '8px var(--space-xs)',
          width: '100%',
          backgroundColor: 'transparent',
        }}
      />
      <Button
        type="submit"
        variant="primary"
        size="md"
        style={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          paddingLeft: 'var(--space-lg)',
          paddingRight: 'var(--space-lg)',
        }}
      >
        Search
      </Button>
    </form>
  );
};

export default SearchBar;
