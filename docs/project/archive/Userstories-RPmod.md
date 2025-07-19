# Userstories RPmod v1

## Why this mod exists - motivation
KoboldAI Lite is a great AI UI, but it is general purpose and do not focus on gameing. Lite tries to give a general userexperience everyone with every use-case can use and adept to their needs. As a generalist tool it can do a lot things very well and is a great UI, but for the narrow use-case that I have it isn't specific enough and lacks some cruicial features.

I am a role player. AI supported role play has different sub-genres:
- chat style role play
- group chat
- narrator based role play

KLITE-RPmod focuses on providing these modes in the best possible way, combining tools other role play specif UIs provide but all on a base of Lite as I am a big KoboldAI Lite fanboy and want to make it the overall best UI. It is in my opinion already the best generalist UI and my mod now makes it also the best role play UI (at least for myself).

Then I got asked, if I can incorporate Adventure Mode, Story Mode and Chat Mode into my mod as well as a tablet and mobile UI mode. That wasn't planned and expanded the features needed in the mod a lot. Originally I planned on only supporting role play with the mod.

## explaining the other modes
I do not use the other modes so I can only sparely explain them.

### Adventure mode:
- uses specifically trained models that understand > as a token to input actions
- knows how to use dice rolls
- writes a story of an adventure with the player in a roguelike style

Features I implemented:
- access to the simplified generation settings of the LLM
- Quick reply prompt slots

### Story mode:
- AI and Player work together as co-authors writing a shortstory or novel together

Features I implemented:
- access to the simplified generation settings of the LLM
- Bookmark system to navigate in the story

### Chat mode:
- in Lite chat mode is based on aesthetic mode and it is a restyle of Lite's UI to look like a mobile phone. You communicate with text message typical bubbles on left and right side to give you the feeling as if you are interacting on a mobile phone in a massaging app.
- as this mode automatically falls back to "base model" usage instead of "instruct model" I do not use it, because I made the experience that for role play using instruct with a well made system prompt is better today

Features I implemented:
- access to the simplified generation settings of the LLM

## Panels
Lite itself has an option to split it's "settings" and "context" panels into "SidePanel Mode" where each panel resides on one side. I liked that mode very much but wanted to make it more modern and elegant. A predecessor of Lite had collapsible side panels so I jumped on that idea.

The left and right panel are my basis which I fill with helpful use cases for the player. Each representing certain workflows. The core / main view I overlayed with my implementation to be able to change appearance of all elements to my liking like the buttons and so on. I had a very concrete idea how I wanted my UI to look like and I wanted to be able to change it's colours by mood or storyelements later on. That was my basic thought there and the rest I just made up on the way by adding to it again and again and refining. I'm at the moment happy with the look of the Rpmod UI.

## Panels relevance
Irrelevant:
PLAY_STORY, PLAY_ADV, PLAY_CHAT: Panels for the modes like explained above. I only implemented them because I got asked for it. Requirements came from outside.

All panels otherwise are important that is why we have them. I was very selective what we implemented to only create what really brings benefits, but there are some parallel path.

Role play needs:
- Characters and player Persona (which is just another name to differentiate the character the player impersonates from characters the AI impersonates, but "persona" is a character definition)
- Scenarios
- Instructions for the AI
    - System prompt
    - Behaviour rules
    - Author's notes
    - Memory
- Settings for the AI (that the user can easily access while in play)
- (optionally) World
- (optionally) side characters like NPCs or definitions from relatives or friends that not play an active role
- (optionally) reference materials
- (optionally) quality of life features/tools for the user
- (optionally) mood

One addition from an AI perspective these separations have almost no effect for you, it is just to make it easier for the player. System prompt, rules, author's note, memory, world are all just text inputs that get added to the context, but we separate them to be able to build the context intelligently for example in group chat switching the character data according to speaking character. The main reason to separate the entries is because the role players know these elements from the TavernCard format and expect them. That is also a big reason for this mod, because Lite doesn't support this separation by default. Lite on import of a V2 character just combines all parts in memory, but that just as a sidenote.

Depending on this list I can assign all features to the different panels:

PLAY_RP:
- System prompt
- Settings for the AI (that the user can easily access while in play)
- Character & Persona Integration
- (optional) Narrator (this is a mood feature I invented for myself, I like it to have a narration based output in my role play from time to time on demand that can narrate from different viewpoints as narrator, intelligent AIs can handle this)

Implemented in main UI left buttons, but bound to PLAY_RP:
- (optional) options to manipulate the role play (edit, undo, regenerate, Me as AI, AI as ME; they can bring in some energy if a role play stales or goes in a direction the player doesn't want; another option for this manipulation would be OOC speaking with the AI, but that is something we don't need a special tool for, the player can just prompt to go OOC and discuss the direction of the plot or similar things like for example boundaries or change in tone/mood/plot)

TOOLS (some frequently used on PLAY_RP panel for quicker access, but they are tools):
- Quick Save (on PLAY_RP)
- Automatic Prompt sending (on PLAY_RP)
- analysis of context to get a feel how much context is used for what, that is important for local LLM usage as the available context there can be small
- smart memory generation system, so the user does not have to write summaries by hand to optimize context usage; auto regenerate by criterias
- an option to make a quick dice role for example if the player wants to decide something by chance or in a tabletop role play scenario
- export of the chat or story

SCENE:
- setting the mood by theming the UI
- enhancing the roleplay by generating images based on the story, plot, actions, ... (AI based image generation)

GROUP:
- configuring, controlling and playing group chat (group chat means the AI controls several characters and these answer according to different systems which select them; it basically means the AI dynamically switches between several characters in the role play)

HELP:
- Knowledge base for help and rules
- Hotkeys

CHARS:
- Characters and player Persona
- Character images
- Characters can come with Scenarios
- Characters can come with Memory
- Characters can come with World
- Characters can come with Rules
- Characters can come with Author's notes
... see TavernCard definition for the full list

MEMORY:
- (Instructions for the AI) - Memory (as fundament for the role play interaction, to give it a living feeling, for example so that a character can recall a conversation we had before in a role play; isn't limited to memories, basically memory is just a text input that gets fully added to the context send to the AI, it is mostly used for memory, but it can basically be used for anything to provide for the AI; most users understand the concept of memory better that is why it is named like this)

NOTES: 
- User notes so that it is possible to make quick notes the AI can't read while playing
- (Instructions for the AI) - Author's notes

TEXTDB:
- reference materials


A special place in all of this has WorldInfo because worldinfo can replace a lot of the above systems and there are different type of user adaption rates:
1. character 100% - stores everything in the taverncard and doesn't use WI
2. character card for everything except world - stores the world, locations and NPCs in world info to different degrees of detail
3. stores everything in worldinfo (characters, world, scenarios, system prompt)

World info is a very flexible system that can store any data and activate it (then it gets added to context) or deactivate it (hidden from context). But it is also possible to switch WI groups on and off as a whole or trigger entries based on keywords and even prevent triggering by non keywords. So a complex, but very versatile system, that some players prefer to store all their data in.

I focus mainly on the approach "2. character card for everything except world - stores the world, locations and NPCs in world info to different degrees of detail" because that is the approach I am using, but I don't want to exclude other role players because of that.

## Doing a role play from start to finish (without a self made character / character downloaded from internet)
1. The player has a character as tavern card from the internet. It is a card that provides the character of a female elf. As environment the description of a basic fantasy tavern. World info about the town, the world and the magic system. A scenario where the player was invited by the elf to a drink and suddenly a big human male appears and starts a fight with the girl, where you are now drawn in.
2. The player imports the taverncard into the character manager on CHARS panel.
3. The player starts the scenario from the details page of the character.
4. all character and other role play data gets loaded, first message in chat and the player now can start the role play. AI and settings are all primed. Perhaps he has to adjust the "Settings for the AI" (Generation Control) to his liking, but the default works fine.
5. The player plays the role play.
6. The player saves the session and closes the browser or finishes the session without saving it.

## Advanced role play
1. the player has a library of self made and downloaded characters. in PLAY_RP panel he configures a persona and character.
2. in system prompt or any other input box that gets added to context or developing it in OOC the player defines the scenario, optionally loading information from world info
3. the player plays the role play while optionally using tools and mood elements, making notes and memory entries and edits as needed to have a fun time
4. exports or saves the role play perhaps even quick saves to test different plot directions from a certain point
5. ends the role play

## Group chat
1. The player enables Group chat
2. the player loads several characters into group chat
3. the player select the advancement system and other parameters
4. on PLAY_RP panel the player selects a Persona and "Settings for the AI" (Generation Control)
5. back on Group panel the player controls the flow of the group chat
6. using tools, memory, mood, wi and so on is optionally
7. the player ends his group chat with or without saving

## Visual novel / Waifu players
This is a special type of role play where you imagine to chat with a virtual girlfriend, which is most of the time depicted by an anime girl. In this mode the UI and mood implementation is the most important part. There are systems available that the user can integrate mood based images of his waifu and depending on keyword detection the images swap as background giving the idea of her showing emotions. This type of implementation is something I plan to do later, but it has a low priority.

## Creators
At the moment we do not directly support taverncard and character creators, but I want to include that in the future in form of an taverncard V3 card-editor/-generator. The generator has a low priority, but the editor mid priority, so that in detail view on CHARS panel editing is possible.

## Senior level role play
The player creates a role play environment using all the tools we provide how he thinks it is suitable in an for us unpredictable way. Perhaps only using world info or importing his favorite novel in text db to replay it with the AI or who knows what. For these players we can just provide a stable toolset and they will figure out their favorit use cases.