// ======== IMPORTS FIREBASE ========
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRuvYrZLMLRdV5ckKT-0r-hXsgO7umKDE",
  authDomain: "controle-estoque-b3040.firebaseapp.com",
  projectId: "controle-estoque-b3040",
  storageBucket: "controle-estoque-b3040.firebasestorage.app",
  messagingSenderId: "382920463140",
  appId: "1:382920463140:web:836453ff63c47b8fb159b1",
  measurementId: "G-TWDYX1DND1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ======== VARIÁVEIS ========
let user = null;
let lancamentos = [];
let editIndex = null;

// ======== LOGIN/LOGOUT ========
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const userInfo = document.getElementById("userInfo");

btnLogin.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Erro ao entrar: " + e.message);
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (usuario) => {
  if (usuario) {
    user = usuario;
    userInfo.textContent = `Olá, ${user.displayName}!`;
    btnLogin.classList.add("d-none");
    btnLogout.classList.remove("d-none");
    await carregarLancamentos();
  } else {
    user = null;
    lancamentos = [];
    userInfo.textContent = "";
    btnLogin.classList.remove("d-none");
    btnLogout.classList.add("d-none");
    document.querySelector("#tabelaRegistros tbody").innerHTML = "";
    document.getElementById("tabelaControle").innerHTML = "";
  }
});

// ======== FIRESTORE ========
async function carregarLancamentos() {
  lancamentos = [];
  const q = query(collection(db, "lancamentos"), where("uid", "==", user.uid));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => lancamentos.push({ id: docSnap.id, ...docSnap.data() }));
  atualizarTabela();
  atualizarControle();
}

async function salvarLancamento(dados) {
  await addDoc(collection(db, "lancamentos"), { ...dados, uid: user.uid });
  await carregarLancamentos();
}

async function atualizarLancamento(id, dados) {
  await updateDoc(doc(db, "lancamentos", id), dados);
  await carregarLancamentos();
}

async function excluirLancamento(id) {
  await deleteDoc(doc(db, "lancamentos", id));
  await carregarLancamentos();
}

// ======== FORMULÁRIO ========
document.getElementById("data").addEventListener("change", (e) => {
  const data = new Date(e.target.value);
  if (!isNaN(data)) {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("mes").value = meses[data.getMonth()];
  }
});

document.getElementById("formLancamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!user) {
    alert("Faça login primeiro!");
    return;
  }
  const data = document.getElementById("data").value;
  const mes = document.getElementById("mes").value;
  const categoria = document.getElementById("categoria").value;
  const descricao = document.getElementById("descricao").value;
  const valor = parseFloat(document.getElementById("valor").value);

  const novo = { data, mes, categoria, descricao, valor };

  if (editIndex === null) {
    await salvarLancamento(novo);
  } else {
    await atualizarLancamento(lancamentos[editIndex].id, novo);
    editIndex = null;
  }

  e.target.reset();
});

// ======== EXIBIÇÃO ========
// Use as funções atualizarTabela() e atualizarControle() do código anterior
// Elas funcionam sem mudanças, pois os dados já vêm do Firestore.

