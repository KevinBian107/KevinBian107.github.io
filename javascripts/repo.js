document.addEventListener("DOMContentLoaded", function() {
    const pinnedRepos = ['laplacian_eigenmap_vis','mllm_embodied_simulation','ensemble_imbalance_data','Simple_CL_Env'];
    const container = document.getElementById('repositories');

    pinnedRepos.forEach(repoName => {
        fetch(`https://api.github.com/repos/KevinBian107/${repoName}`)
        .then(response => response.json())
        .then(repo => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${repo.name}</h3>
                <p>${repo.description}</p>
                <a href="${repo.html_url}" target="_blank">View on GitHub</a>
            `;
            container.appendChild(card);
        })
        .catch(error => console.error('Error loading GitHub data for repo: ', error));
    });
});
