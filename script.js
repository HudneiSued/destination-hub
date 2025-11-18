document.addEventListener("DOMContentLoaded", () => {
  const searchButton = document.getElementById("search-button");
  const searchInput = document.getElementById("search-input");
  const countriesContainer = document.getElementById("countries-container");
  const loader = document.getElementById("loader");
  let timeUpdateInterval = null; // Variável para controlar o intervalo do relógio

  // Função assíncrona para buscar os dados do país
  const fetchCountryData = async () => {
    const countryName = searchInput.value;

    // Interrompe o intervalo de atualização anterior, se existir
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
      timeUpdateInterval = null;
    }

    // Verifica se um país foi selecionado
    if (!countryName) {
      alert("Por favor, selecione um país.");
      return;
    }

    // Limpa resultados anteriores e mostra o loader
    countriesContainer.innerHTML = "";
    loader.style.display = "block";
    countriesContainer.style.display = "none";

    try {
      // Requisição ao backend
      const response = await fetch(`/api/country/${countryName}`);

      if (!response.ok) {
        throw new Error("Erro ao buscar dados do servidor.");
      }

      const { country, exchangeRateToBRL, newsArticles } =
        await response.json();

      // Exibição dos resultados

      displayCountryInfo(country, exchangeRateToBRL, newsArticles);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      countriesContainer.innerHTML = `<p class="error-message">Não foi possível carregar as informações. Tente novamente.</p>`;
    } finally {
      // Esconde o loader e mostra o container de resultados
      loader.style.display = "none";
      countriesContainer.style.display = "flex";
    }
  };

  // Função para obter a hora local usando a API Intl do JavaScript
  const getLocalTime = (timezone) => {
    if (timezone.startsWith("UTC")) {
      // Se for um offset, a API Intl não consegue processar. Retornamos null para tratar na UI.
      return null;
    }
    try {
      return new Date().toLocaleTimeString("pt-BR", { timeZone: timezone });
    } catch (e) {
      // Se mesmo assim der erro, retorna null.
      return null;
    }
  };

  const displayCountryInfo = (country, exchangeRateToBRL, newsArticles) => {
    // Limpa o container antes de adicionar novos cards
    countriesContainer.innerHTML = "";

    const currencyCode = Object.keys(country.currencies)[0];
    const currency = country.currencies[currencyCode];
    const mainTimezoneIdentifier = country.timezones[0]; // Pega o primeiro identificador de fuso horário (ex: "America/Sao_Paulo")
    let localTime = getLocalTime(mainTimezoneIdentifier);

    // Se getLocalTime retornou null, significa que não é um fuso IANA.
    // Nesse caso, não podemos calcular a hora local e o relógio não será iniciado.
    const canDisplayClock = localTime !== null;

    // Monta o HTML do câmbio apenas se a taxa for recebida
    const exchangeRateHTML =
      exchangeRateToBRL !== undefined && exchangeRateToBRL !== null
        ? `<p><strong>Câmbio:</strong> 1 ${
            currency.symbol
          } ≈ R$ ${exchangeRateToBRL.toFixed(2).replace(".", ",")}</p>`
        : "";

    // Card 1: Informações Principais
    const mainCard = document.createElement("div");
    mainCard.className = "country-card";
    mainCard.innerHTML = `
        <img src="${country.flags.svg}" alt="Bandeira de ${country.name.common}" class="country-flag">
        <h2>${country.name.common}</h2>
      `;

    // Card 2: Detalhes da Moeda
    const currencyCard = document.createElement("div");
    currencyCard.className = "country-card details-card";
    currencyCard.innerHTML = `
        <h3><span class="icon">💰</span> Moeda</h3>
        <p><strong>Nome:</strong> ${currency.name} (${currency.symbol})</p>
        ${exchangeRateHTML}
      `;

    // Card 3: Detalhes do Fuso Horário
    const timezoneCard = document.createElement("div");
    timezoneCard.className = "country-card details-card";
    timezoneCard.innerHTML = `
        <h3><span class="icon">⏰</span> Fuso Horário</h3> 
        <p><strong>UTC:</strong> ${mainTimezoneIdentifier}</p>
        ${
          canDisplayClock
            ? `<p><strong>Hora Local:</strong> <span id="local-time-display">${localTime}</span></p>`
            : ""
        }
      `;

    countriesContainer.appendChild(mainCard);
    countriesContainer.appendChild(currencyCard);
    countriesContainer.appendChild(timezoneCard);

    // Card 4: Notícias
    if (newsArticles) {
      const newsCard = document.createElement("div");
      newsCard.className = "country-card details-card news-card";
      let newsHTML = '<h3><span class="icon">📰</span> Últimas Notícias</h3>';

      if (newsArticles.length > 0) {
        newsHTML += newsArticles
          .slice(0, 3) // Limita a 3 notícias para não poluir a tela
          .map(
            (article) => `
              <div class="news-article">
                <h4><a href="${
                  article.link
                }" target="_blank" rel="noopener noreferrer">${
              article.title
            }</a></h4>
                <p>${article.description || "Sem descrição disponível."}</p>
              </div>`
          )
          .join("");
      } else {
        newsHTML += "<p>Nenhuma notícia recente encontrada.</p>";
      }

      newsCard.innerHTML = newsHTML;
      countriesContainer.appendChild(newsCard);
    }

    // Inicia o intervalo para atualizar o relógio a cada segundo
    // Apenas se for possível exibir o relógio (fuso horário IANA válido)
    if (canDisplayClock) {
      const localTimeElement = document.getElementById("local-time-display");
      if (localTimeElement) {
        timeUpdateInterval = setInterval(() => {
          localTimeElement.textContent = getLocalTime(mainTimezoneIdentifier);
        }, 1000);
      }
    }
  };

  // Adiciona o evento de clique ao botão de busca
  searchButton.addEventListener("click", fetchCountryData);
});
