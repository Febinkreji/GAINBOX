import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCOBcP4-ixSC3ZiLyyMLjb5zXaZsgXEzeo',
  authDomain: 'gainbox-dev.firebaseapp.com',
  projectId: 'gainbox-dev',
  storageBucket: 'gainbox-dev.firebasestorage.app',
  messagingSenderId: '556505016272',
  appId: '1:556505016272:web:bb0431d4d857277785bbd5',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// The only two exports the rest of the app needs — `auth` for
// onAuthStateChanged/signOut/getIdToken, `googleProvider` for
// signInWithPopup. See context/AuthProvider.jsx, the only place these are
// imported.
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Without this, a browser that's already signed in to exactly one Google
// account gets silently re-signed into that same account on the next
// signInWithPopup() — there's no way to switch accounts short of clearing
// storage or using Incognito. Forcing the account chooser every time costs
// one extra click for the common case, in exchange for Sign Out actually
// letting someone pick a different account.
googleProvider.setCustomParameters({ prompt: 'select_account' })
