import { AxiosAPI } from "./axios-client";

// ─── Vocabulary Bank ───────────────────────────────────────────────────────

export interface VocabGroup {
  id: string;
  name: string;
  sets: VocabSet[];
}

export interface VocabSet {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  total_words: number;
}

export interface VocabSetStat {
  set_id: string;
  saved_words: number;
  total_words: number;
}

export interface VocabWord {
  id: string;
  value: string;        // English word
  meaning: string;      // Vietnamese definition
  ipa?: string;         // pronunciation
  word_class?: string;  // noun / verb / adj…
  example?: string;
  explanation?: string;
  is_saved?: boolean;
  image?: string;
}

// ─── My Vocabulary ─────────────────────────────────────────────────────────

export interface VocabCategory {
  code: string;
  name: string;
}

export interface MyVocabWord {
  id: string;
  value: string;        // English word
  meaning: string;      // Vietnamese definition
  ipa?: string;         // pronunciation
  word_class?: string;
  example?: string;
  explanation?: string;
  learning_status: 0 | 1 | 2; // 0=chưa thuộc, 1=nhớ sơ, 2=đã thuộc
  image?: string;
}

export interface VocabOverview {
  total_words: number;
  mastered: number;
  partially_remembered: number;
  not_mastered: number;
  categories?: Array<{
    code: string;
    name: string;
    total_words: number;
    mastered: number;
    partially_remembered: number;
    not_mastered: number;
  }>;
}

// ─── API calls ─────────────────────────────────────────────────────────────

export const vocabularyApi = {
  // Vocab Bank
  getGroups: async (): Promise<VocabGroup[]> => {
    const res = await AxiosAPI.get("/v1/vocab/youpass-pick/groups?page=1&page_size=100");
    return res.data?.data?.items || [];
  },

  getSetStats: async (): Promise<VocabSetStat[]> => {
    const res = await AxiosAPI.get("/v1/vocab/youpass-pick/sets/stats?page=1&page_size=100");
    return res.data?.data?.stats || [];
  },

  getSetDetail: async (setId: string): Promise<{ words: VocabWord[]; name: string; description: string }> => {
    const res = await AxiosAPI.get(`/v1/vocab/youpass-pick/sets/${setId}?page=1&page_size=100`);
    return res.data?.data || { words: [], name: "", description: "" };
  },

  // My Vocabulary
  getCategories: async (): Promise<VocabCategory[]> => {
    const res = await AxiosAPI.get("/v1/users/vocab-categories");
    return res.data?.data?.items || [];
  },

  createCategory: async (name: string): Promise<VocabCategory> => {
    const res = await AxiosAPI.post("/v1/users/vocab-categories", { name });
    return res.data?.data;
  },

  getMyVocabs: async (categoryCode: string): Promise<{ items: MyVocabWord[]; total: number }> => {
    const res = await AxiosAPI.get(`/v1/users/vocabs?categories=${categoryCode}&page_size=300&page=1`);
    return res.data?.data || { items: [], total: 0 };
  },

  getOverview: async (): Promise<VocabOverview> => {
    const res = await AxiosAPI.get("/v1/users/vocabs/overview");
    return res.data?.data || { total_words: 0, mastered: 0, partially_remembered: 0, not_mastered: 0 };
  },

  saveVocabs: async (params: {
    set_id: string;
    category_code: string;
    add_type: "ALL" | "SELECTED";
    vocab_ids?: string[];
    skip_existing?: boolean;
  }): Promise<void> => {
    await AxiosAPI.post("/v1/users/vocabs", params);
  },

  updateStatus: async (vocab_ids: string[], status: 0 | 1 | 2): Promise<void> => {
    await AxiosAPI.patch("/v1/users/vocabs/batch-update", { vocab_ids, status });
  },

  deleteVocabs: async (vocab_ids: string[]): Promise<void> => {
    await AxiosAPI.patch("/v1/users/vocabs/batch-update", { vocab_ids, status: 0 });
  },
};
