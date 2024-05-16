# Kaiwen (Kevin) Bian

My name is Kaiwen (Kevin) Bian and I am a undergraduate student at UCSD double majoring in **Data Science** & **Cognitive Behavoral Neuroscience** and minoring in **Mathamatics**. I am passionate about finding bridges between Data Science and Neuroscience through forms of algorithm and machine learning to help both communities better understand the machines and ourselves. I am fluent in both Chinese and English, and open- minded for new ideas and learning opportunities.

**Email**: [kaiwenbian107@gmail.com](kaiwenbian107@gmail.com)

-- [Resume](assets/Kaiwen%20Bian%20Resume%202024:3:31.pdf) -- [CV](assets/Kaiwen%20Bian%20CV%202024:March:31.pdf) -- [Github](https://github.com/KevinBian107) -- [Linkedin](https://www.linkedin.com/in/kbian107/) --

# Interships & Apprenticeships

## Salk Institute
I am currently working as a undergraduate research intern at [Talmo's Lab](https://talmolab.org/) in the Salk Institute. we are working on the the VNL project, a collaboration between Salk Institute and Harvard University aiming to use advance **Deep Reinforcement Learning** method such as **Imitation Learning** to create working piepliens for computational models of the brain using GPU accelerated JAX & Brax.

<div style="text-align: center;">
    <img src="assets/vnl.png" alt="imitation pipeline" style="width:100%; height:auto;">
</div>

*Abstarct Deep Imitation Learning Idea (borrowed from Talmo's Lab VNL slides)*

<a href="https://talmolab.org/" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 12px;">Visit Our Lab Website</a>

We aim to create pipelines with architectures and learning alogorithm that is capable of generalizing and continual learning low level skills that is transferable for multiple higher level task driven goals, trying to get closer to what "real brain" is capable of doing.

<div style="text-align: center;">
    <img src="assets/Intentional_network.png" alt="imitation pipeline" style="width:100%; height:auto;">
</div>

*Deep imitation learning illustartion using encoder/decoder structure (borrowed from VNL Research Strategy)*

Demonstarting our goal where an agent (virtual rodent) can use the intentinal network learned from deep imitation learning algorithm to learn to take actions just as an real rodent but virtually (shown in the MoCap registration from real rodent).

<div style="text-align: center;">
    <img src="assets/vnl_2.png" alt="imitation pipeline" style="width:100%; height:auto;">
</div>

*MoCap registration of rodent(borrowed from Talmo's Lab VNL slides)*

For demo purposes, here is an easy version of what we do in our lab: self-learning (proprioception data DRL trained) Brax ant

<div style="text-align: center; max-width: 100%;">
    <video controls style="width: 100%; height: auto;">
        <source src="assets/cross_gap_vision_0.1.mp4" type="video/mp4">
        Your browser does not support the video tag.
    </video>
</div>

*Using custom dm_control env and Proximal Policy Control for training*


## UCSD FMP Research Scholar
I am currently researching on **Affordance Embodied Simulation’s presences in Multimodal models** through the UCSD Faculty Mentorship Program (started Sep 2023) under the supervision of [Sean Trott](https://seantrott.github.io/). We try to improve the reliability of machine learning models through examining the degree of models’ “understanding” of the subtle keys in human languages and how it is used to map the world we know.

<a href="https://github.com/KevinBian107/mllm_embodied_simulation" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 12px;">Visit Project GitHub!</a>

# Projects
## Homogenous Ensemble Learning on Highly Imbalanced Data
Training on large corpus of `recipe` data to analyze the "essential component" of each user's textual input (detecting user preference) by different feature egineering (i.e. TF-IDF textual analysis), then building a homogenous ensemble learning system using random forest to predict user preference (highly unbalanced in this data set).

<a href="https://kevinbian107.github.io/ensemble-imbalanced-data/" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; font-size: 12px;">Visit Project Website!</a>

## Essential Algorithms for Data Science Practices
_Currently Developing_

An educational package demnonstrating fundamental algorithms that is essential to practices in data science, machine learning, and optimization, currently include:
- Search algorithms (Depth First Search, Breadth First Search, BellmanFord's Algorithm, Dijkstra's Algorithm (Uniform Cost Search), Kruskal's Algorithm, A* Search)