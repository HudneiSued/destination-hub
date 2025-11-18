import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração inicial do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite que o frontend (em outra porta/URL) acesse esta API
app.use(express.static(".")); // Serve os arquivos estáticos (index.html, style.css, etc.)

// Definição da rota da API
app.get("/api/country/:countryName", async (req, res) => {
  const { countryName } = req.params;
  const NEWS_API_KEY = process.env.NEWS_API_KEY; // Pega a chave de API do ambiente, de forma segura

  try {
    // Requisições em Paralelo para maior eficiência

    // Busca de dados do país
    const countryPromise = fetch(
      `https://restcountries.com/v3.1/name/${countryName}?fields=name,currencies,flags,timezones,cca2`
    ).then((response) => {
      if (!response.ok) throw new Error("País não encontrado");
      return response.json();
    });

    // As outras requisições dependem do resultado da primeira, então esperamos por ela
    const countryData = await countryPromise;
    const country = countryData[0];
    const currencyCode = Object.keys(country.currencies)[0];
    const countryCode = country.cca2;

    // Busca da taxa de câmbio (se não for BRL)
    const exchangeRatePromise =
      currencyCode === "BRL"
        ? Promise.resolve(null) // Se for Real, não busca câmbio
        : fetch(`https://open.er-api.com/v6/latest/${currencyCode}`)
            .then((res) => res.json())
            .then((data) => data.rates.BRL);

    // Busca de notícias
    const newsPromise = fetch(
      `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&country=${countryCode.toLowerCase()}&language=pt`
    )
      .then((res) => res.json())
      .then((data) => data.results);

    // Espera todas as promessas serem resolvidas
    const [exchangeRateToBRL, newsArticles] = await Promise.all([
      exchangeRatePromise,
      newsPromise,
    ]);

    // Envio da resposta agregada para o frontend
    res.json({
      country,
      exchangeRateToBRL,
      newsArticles,
    });
  } catch (error) {
    console.error("Erro no servidor:", error.message);
    res
      .status(500)
      .json({ message: "Erro ao buscar dados do país.", error: error.message });
  }
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
