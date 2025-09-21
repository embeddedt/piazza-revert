// ==UserScript==
// @name         Piazza Revert
// @namespace    https://github.com/embeddedt
// @version      0.3
// @description  Revert Piazza to the old user interface
// @author       embeddedt
// @match        https://piazza.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=piazza.com
// @homepageURL  https://github.com/embeddedt/piazza-revert
// @updateURL    https://github.com/embeddedt/piazza-revert/raw/refs/heads/main/revert.user.js
// @downloadURL  https://github.com/embeddedt/piazza-revert/raw/refs/heads/main/revert.user.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    function injectEndorsementFix() {
        const endorsementInfo = new Map();
        let lastKnownPathname = null;

        function populateEndorsementInfo(obj) {
            if (!obj || typeof obj !== 'object') return;

            const endorse = [obj.tag_good, obj.tag_endorse].find(Boolean);

            // If the object has an id and tag_good, store it in the Map
            if (obj.id && Array.isArray(endorse) && endorse.length > 0) {
                endorsementInfo.set(obj.id, endorse);
            }

            // Recurse into object properties
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const val = obj[key];
                    if (Array.isArray(val)) {
                        val.forEach(item => populateEndorsementInfo(item));
                    } else if (typeof val === 'object' && val !== null) {
                        populateEndorsementInfo(val);
                    }
                }
            }
        }

        async function updateEndorsementInfo() {
            const url = window.location.pathname;

            const match = url.match(/\/class\/([^\/]+)\/post\/([^\/]+)/);

            endorsementInfo.clear();

            if (match) {
                const classId = match[1];
                const postId = match[2];
                const res = await fetch("https://piazza.com/logic/api?method=content.get", {
                    "credentials": "include",
                    "headers": {
                        "Accept": "application/json, text/plain, */*",
                        "Pragma": "no-cache",
                        "Cache-Control": "no-cache",
                        "CSRF-Token": unsafeWindow.CSRF_TOKEN
                    },
                    "referrer": window.location.href,
                    "body": JSON.stringify({
                        "method": "content.get",
                        "params": {
                            "cid": postId,
                            "nid": classId,
                            "student_view": null
                        }
                    }),
                    "method": "POST",
                    "mode": "cors"
                });
                const val = await res.json();
                populateEndorsementInfo(val);
            }
            console.log(endorsementInfo);
        }

        function findIdFromArticle(article) {
            const targetDiv = article.querySelector('div[id$="_render"]');
            if (targetDiv != null) {
                return targetDiv.id.replace(/_render$/, '');
            } else {
                return "unknown";
            }
        }

        async function handleEndorsement(targetNode) {
            if (targetNode.classList.contains("endorsement-patched")) {
                return;
            }

            if (lastKnownPathname != window.location.pathname) {
                await updateEndorsementInfo();
                lastKnownPathname = window.location.pathname;
            }
            let commentId;
            const instructorAnswerArticle = targetNode.closest('article[aria-label="Instructor Answer"]');
            if (instructorAnswerArticle) {
                commentId = findIdFromArticle(instructorAnswerArticle);
            } else {
                const mainQuestionArticle = targetNode.closest('article[id="qaContentViewId"]');
                if (mainQuestionArticle != null) {
                    commentId = findIdFromArticle(mainQuestionArticle);
                } else {
                    const commentDiv = targetNode.closest('div[id]');
                    if (commentDiv != null) {
                        commentId = commentDiv.id;
                    }
                }
            }
            let info = endorsementInfo.get(commentId) ?? [];
            info = info.filter(obj => obj.admin).map(obj => obj.name);
            console.log('Found endorsement:', targetNode, "id:", commentId, "info:", info);
            if (info.length > 1) {
                // Swap content
                targetNode.classList.add("endorsement-patched");
                targetNode.textContent = "Endorsed by Instructors (" + info.join(', ') + ")";
            }
        }

        const observer = new MutationObserver(async(mutationsList) => {
            for (const mutation of mutationsList) {
                // Check any newly added nodes
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // element
                        // Case 1: The new node itself is the <b> inside .badge-success
                        if (node.matches('div.badge-success > b') && node.textContent.trim().startsWith("Endorsed by Instructor")) {
                            await handleEndorsement(node);
                        }

                        // Case 2: A container was added that *contains* the target <b>
                        const targetList = node.querySelectorAll?.('div.badge-success > b');
                        for (const target of targetList) {
                            if (target && target.textContent.trim().startsWith("Endorsed by Instructor")) {
                                await handleEndorsement(target);
                            }
                        }
                    }
                }

                // Also check if an existing <b> just got text content added/changed
                if (mutation.type === "characterData") {
                    const parent = mutation.target.parentElement;
                    if (parent?.matches('div.badge-success > b') && parent.textContent.trim().startsWith("Endorsed by Instructor")) {
                        await handleEndorsement(parent);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,        // watch for added/removed elements
            subtree: true,          // include descendants
            characterData: true     // detect text/content changes
        });
    }

    GM_addStyle(`
        /* remove fixation on 1536px width */
        #react_root .folderbar-wrapper, #topbar, .main-content #content-holder, .main-content .questions-and-answers #qanda-content > div {
            max-width: none;
        }


        /* use legacy font */
        #react_root, .btn {
            font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;
        }

        #content-holder .feed-wrapper {
            padding-left: 0;
            margin-left: 0;
        }

        #content-holder #react_feed #feed_list_wrapper {
            border-radius: 0px;
            margin-bottom: 0px;
        }

        #react_feed #feed_list_wrapper #feed_list ul li.feed_item .content .snippet {
            font-family: "Lucida Grande",Lucida,Tahoma,Verdana,Arial,sans-serif;
            color: #666;
        }

        #feed_search_bar {
            max-width: 400px;
            padding-left: 4px;
        }

        /* move menu items next to course name */
        #site-nav {
            margin-left: 0 !important;
        }

        .class-menu-wrapper {
            margin-left: 10em;
        }

        #react_feed {
            padding: 0;
        }

        #qanda-content > div > hr {
           border-top: none;
           height: 1em;
        }

        * {
            letter-spacing: normal !important;
        }

        /* fix QA section */
        :root {
            --qa-section-border-color: #dee2e6;
            --qa-footer-background-color: rgb(242, 242, 242);
            --qa-followup-background-color: #f6f7f6;
            --qa-followup-reply-background-color: #f2f2f2;
            --qa-avatar-border-color: #fff;
            --qa-article-border-color: #cccccc;
        }

        html[data-darkreader-scheme="dark"] {
            --qa-section-border-color: #383d3f;
            --qa-footer-background-color: #222526;
            --qa-followup-background-color: #1d1f20;
            --qa-followup-reply-background-color: #1f2223;
            --qa-avatar-border-color: #303436;
            --qa-article-border-color: #3e4446;
        }

        .main-content .questions-and-answers {
            background-color: #eaeef4;
        }

        [data-darkreader-scheme="dark"] .main-content .questions-and-answers {
            background-color: #212425;
        }

        [data-darkreader-scheme="dark"] #react_feed #feed_list_wrapper #feed_list ul li.feed_item .content .snippet {
            color: #a8a095;
        }

        [data-darkreader-scheme="dark"] #react_feed #feed_list_wrapper #feed_list ul li.feed_item.selected {
            background-color: #3c3200;
        }

        #react_feed #feed_list_wrapper #feed_list ul li.feed_item .feed_item_dropdown_selector {
            top: auto;
            left: auto;
            bottom: 4px;
            right: 4px;
        }

        #react_feed + .questions-and-answers #qanda-content {
            margin-left: 0px;
            padding-right: 9px;
        }

        #qanda-content {
            padding: 0 8px;
        }

        #post-header > button[aria-label="Close"] {
            display: none;
        }

        .main-content .questions-and-answers #qanda-content #post-header {
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            box-shadow: 0 1px 4px rgba(0,0,0,.15);
            border: 1px solid var(--qa-section-border-color);
            padding: 0.5rem 1rem !important;
            margin: 0 0.5rem;
        }

        .main-content .questions-and-answers #qanda-content .post-footer {
            border-top: 1px solid var(--qa-section-border-color);
            background: none;
        }

        .main-content .questions-and-answers #qanda-content article[data-id="i_answer"], .main-content .questions-and-answers #qanda-content article[data-id="s_answer"]  {
            background-color: #ffffff;
        }

        [data-darkreader-scheme="dark"] .main-content .questions-and-answers #qanda-content article[data-id="i_answer"], [data-darkreader-scheme="dark"] .main-content .questions-and-answers #qanda-content article[data-id="s_answer"] {
            background-color: #181a1b;
        }

        .main-content .questions-and-answers #qanda-content article#qaContentViewId {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            box-shadow: 0 1px 4px rgba(0,0,0,.15);
            padding-top: 0.75rem;
            margin: 0 0.5rem;
            padding-bottom: 0 !important;
            border: 1px solid var(--qa-section-border-color);
            border-top: none;
            border-bottom-left-radius: 5px;
            border-bottom-right-radius: 5px;
        }

        .main-content .questions-and-answers #qanda-content .followup_container {
            margin-left: 0.5rem;
            margin-right: 0.5rem;
        }

        article.answer {
            box-shadow: 0 1px 4px rgba(0,0,0,.15);
            padding: 0 !important;
            border-radius: 5px;
        }

        article.answer > header {
            padding-left: 1rem;
            padding-right: 1rem;
            padding-bottom: 0.5rem;
        }

        article.answer > footer, .main-content .questions-and-answers #qanda-content .post-footer {
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            height: 2.25rem;
            background-color: var(--qa-footer-background-color);
            border-bottom-left-radius: 5px;
            border-bottom-right-radius: 5px;
        }

        article.answer > footer > div > div.pl-4 {
            padding-left: 0.5rem !important;
            margin-top: 0 !important;
        }

        article.answer {
            position: relative;
            border: 1px solid var(--qa-article-border-color);
        }

        .main-content .questions-and-answers #qanda-content .answer .update_text[data-id="contributors"] {
            margin: 0;
            text-align: right;
            position: absolute;
            bottom: 0.5rem;
            right: 1rem;
        }

        article.answer > div:first-of-type {
            margin-left: 0 !important;
        }

        article.answer > .content {
            margin: 0 !important;
            padding-right: 1.5rem !important;
            padding-top: 1rem;
            padding-bottom: 1rem;
            border-top: 1px solid var(--qa-section-border-color);
            border-bottom: 1px solid var(--qa-section-border-color);
        }

        article.answer button.btn-ghost, .main-content .questions-and-answers #qanda-content .post-footer button.btn-ghost {
            background-color: #1370c4;
            color: #fff;
            align-items: center;
        }

        article.answer button.btn-ghost:hover:not(:disabled), .main-content .questions-and-answers #qanda-content .post-footer button.btn-ghost:hover:not(:disabled) {
            background-color: #0f5391;
        }

        article.answer button.btn-ghost > svg, .main-content .questions-and-answers #qanda-content .post-footer button.btn-ghost > svg {
            display: none;
        }

        article.followup_container > header {
            padding-top: 0.5rem;
            margin-bottom: 0 !important;
        }

        article.followup_container .followup {
            background: var(--qa-followup-background-color);
        }

        article.followup_container .followup_reply {
            background: var(--qa-followup-reply-background-color);
        }

        article.followup_container .followup .followup_content_wrapper > .border-left {
            border-left: 0 !important;
        }

        .main-content .questions-and-answers #qanda-content article .content .avatar {
            border-radius: 0;
            border: 2px solid var(--qa-avatar-border-color);
        }

        .followup.private {
            border: 9px solid #343a40;
        }

        .followup.private .badge.bg-dark {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }
    `);

    injectEndorsementFix();
})();
