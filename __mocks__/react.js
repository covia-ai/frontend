// __mocks__/next-auth/react.js
const useSession = jest.fn();
const signIn = jest.fn();
const signOut = jest.fn();
const SessionProvider = ({ children }) => children;

module.exports = {
  useSession,
  signIn,
  signOut,
  SessionProvider,
};