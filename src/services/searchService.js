const normalizeText = (text) => text.toLowerCase().trim();

const searchInItem = (item, query) => {
  const q = normalizeText(query);

  const searchFields = [
    item.title,
    item.description,
    item.content,
    item.metadata?.url,
    item.metadata?.domain,
    item.metadata?.ocrText,
  ];

  return searchFields.some(
    (field) => field && normalizeText(field).includes(q)
  );
};

const filterItems = (items, type) => {
  if (type === 'all') return items;
  return items.filter((item) => item.type === type);
};

const sortItems = (items, sortBy) => {
  const sorted = [...items];
  if (sortBy === 'newest') {
    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'oldest') {
    sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  return sorted;
};

export const searchService = {
  searchInItem,
  filterItems,
  sortItems,
};
