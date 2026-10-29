# REPLAY LAB

A pastel pixel-art childhood-memory concept studio for squishy and slime design. The professional visual edition uses a clearer brand hierarchy, a guided four-step studio, responsive navigation, collection filters and a transparent demo-price breakdown.

Live demo: https://blimmy.github.io/replay-lab/

## Try it

Choose a toy and shape; customise colours, patterns, texture, scent, face and details. Add a name and memory, save a design, download its PNG, or share appearance settings. Memory text is excluded from share links. The notebook can be exported and imported. Collection favourites and demo reservations are local to each browser.

Research corner contains an English consent-screened, branching questionnaire. Participants download JSON and voluntarily share it with the researcher. Researcher tools validate imported responses and export CSV. There is no central submission, payment service or real production order.

## Class materials

The downloads folder contains the redesigned professional deck with editable text, tables and diagrams, script and questionnaire, PDF copies, fieldwork worksheets, a trend canvas and a complete ZIP pack. The 18-slide deck embeds a 25-second order-demo MP4 on slide 11. The expanded 1,105-word script targets 8:00 including narration over the demo and the spoken source slide. Each of the 18 slides has a separate SAY THIS page; the PowerPoint notes contain the same narration. The silent clip has English on-screen captions and is also playable on the homepage and downloadable separately. The final recording must be timed. Slide 4 includes the presenter’s informal market interview as an English paraphrase. Market name, interview date and interviewee role are not yet supplied; this is not a customer count or proof of purchases.

## Run locally

No build step or dependencies are needed for the site. From this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/. ES modules and the questionnaire require HTTP, rather than opening index.html directly.

## Hosting

GitHub Pages serves the root of the main branch. All assets use relative paths. The .nojekyll file keeps static assets intact.

## Artwork and fonts

Pixel drawings are original canvas/SVG geometry. No game assets are used. Press Start 2P and Nunito are bundled with their OFL licenses in assets/.
