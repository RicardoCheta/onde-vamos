import { create } from 'zustand';

// Guarda um código de convite recebido por deep link enquanto o utilizador
// ainda não tem sessão iniciada, para se juntar automaticamente ao grupo
// assim que fizer login/registo.
interface InviteState {
  pendingCode: string | null;
  setPendingCode: (code: string | null) => void;
}

export const useInviteStore = create<InviteState>((set) => ({
  pendingCode: null,
  setPendingCode: (code) => set({ pendingCode: code }),
}));
