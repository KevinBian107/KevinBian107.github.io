// document.addEventListener("DOMContentLoaded", function() {
//     const pinnedRepos = ['laplacian_eigenmap_vis','mllm_embodied_simulation','ensemble_imbalance_data','Simple_CL_Env'];
//     const container = document.getElementById('repositories');

//     pinnedRepos.forEach(repoName => {
//         fetch(`https://api.github.com/repos/KevinBian107/${repoName}`)
//         .then(response => response.json())
//         .then(repo => {
//             const card = document.createElement('div');
//             card.className = 'card';
//             card.innerHTML = `
//                 <h3 class='repo_word'>${repo.name}</h3>
//                 <p class='repo_p'>${repo.description}</p>
//                 <a href="${repo.html_url}" target="_blank">View on GitHub</a>
//             `;
//             container.appendChild(card);
//         })
//         .catch(error => console.error('Error loading GitHub data for repo: ', error));
//     });
// });

document.addEventListener("DOMContentLoaded", function() {
    const pinnedRepos = [
        'laplacian_eigenmap_vis',
        'mllm_embodied_simulation',
        'ensemble_imbalance_data',
        'Simple_CL_Env',
        // 'UCSD-Study-Hours'
    ];
    const labRepos = ['VNL-Brax-Imitation']
    const container = document.getElementById('repositories');

    labRepos.forEach(repoName => {
        fetch(`https://api.github.com/repos/talmolab/${repoName}`)
        .then(response => response.json())
        .then(repo => createCard(repo, container))
        .catch(error => console.error('Error loading GitHub data for repo: ', error));
    });

    pinnedRepos.forEach(repoName => {
        fetch(`https://api.github.com/repos/KevinBian107/${repoName}`)
        .then(response => response.json())
        .then(repo => createCard(repo, container))
        .catch(error => console.error('Error loading GitHub data for repo: ', error));
    });
});

function createCard(repoData, container) {
    const card = document.createElement('div');
    card.className = 'card';
    const languageIcon = getLanguageIcon(repoData.language);
    const languageColor = getLanguageColor(repoData.language);
    card.innerHTML = `
        <div class='repo_header'>
            <h3 class='repo_word'> <i class="fab fa-github"></i> ${repoData.name}</h3>
        </div>
        <p class='repo_p'>${repoData.description}</p>
        <p class='repo_p'><span class="language_dot" style="background-color: ${languageColor};"></span><i class="${languageIcon}"></i> ${repoData.language}</p>
        <a href="${repoData.html_url}" target="_blank">View on GitHub</a>
    `;
    container.appendChild(card);
}

function getLanguageIcon(language) {
    switch (language) {
        case 'Jupyter Notebook':
            return 'fas fa-book';
        case 'JavaScript':
            return 'fab fa-js-square';
        case 'Python':
            return 'fab fa-python';
        case 'Ruby':
            return 'fab fa-ruby';
        case 'Java':
            return 'fab fa-java';
        default:
            return 'fas fa-code'; // default icon if language is not matched
    }
}

function getLanguageColor(language) {
    switch (language) {
        case 'Jupyter Notebook':
            return '#DA5B0B';
        case 'JavaScript':
            return '#f1e05a';
        case 'Python':
            return '#3572A5';
        case 'Ruby':
            return '#701516';
        case 'Java':
            return '#b07219';
        default:
            return '#ccc'; // default color if language is not matched
    }
}