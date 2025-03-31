
// QBO Parser specific types
export interface QBOTransaction {
  STMTTRN?: {
    TRNTYPE?: string;
    DTPOSTED?: string;
    TRNAMT?: string;
    FITID?: string;
    NAME?: string;
    MEMO?: string;
    CHECKNUM?: string;
  };
}

// Category patterns type
export interface CategoryPattern {
  pattern: RegExp;
  category: string;
  subcategory: string;
}

// Location patterns type
export interface LocationPattern {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => string;
}
