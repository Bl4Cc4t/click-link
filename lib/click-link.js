const shell = require("electron").shell
const { CompositeDisposable } = require("atom")

function activate(state) {
  this.subscriptions = new CompositeDisposable()
  let paneContainer = atom.workspace.activePaneContainer.paneContainer
  const linkExp = /^(https?|s?ftp|ftps|file|smb|afp|nfs|(?:x-)?man(?:-page)?|gopher|txmt|issue|atom):\/\//

  // on link click
  paneContainer.element.addEventListener("click", function(e) {
    let editor = atom.workspace.getActiveTextEditor()
    if (!editor) return

    let isMarkdown = editor.getGrammar().scopeName == "source.gfm"
    /*
    * Does the link have a hyperlink class
    * If so, it doesn't matter if this is a markdown file or not
    * We can just use the normal routine to get the link
    */
    let isNormalHyperlink = false
    let element = null

    /*
    * We search the list with parent nodes upwards until we find a link element
    * This is an element with class hyperlink or if we're in markdown an element
    * with class link
    */
    for (let i in e.path) {
      let path = e.path[i]
      if (path.classList != undefined) {
        if (path.classList.contains("syntax--hyperlink") > 0) {
          isNormalHyperlink = true
          element = path
          break

        } else if (isMarkdown && path.classList.contains("syntax--link") > 0) {
          let child = path.querySelector(".syntax--link")

          /*
          * Markdown links can have the following structure
          * [name](url) both the whole construct as well as the url
          * (with the parentheses) have the link class
          * If the clicked element with the link class has a child
          * that has also the link class, we have clicked somewhere
          * around "[name]" but since we search for a child with the
          * link class, element will always be the element containing
          * "(url)"
          */
          element = child ? child : path
          break
        }
      }
    }

    // requires https://atom.io/packages/language-hyperlink to highlight hyperlink
    if (element) {
      if (e.ctrlKey || e.metaKey) {
        /*
        * Remove cursor that was created by clicking the link
        * But only if it is not the only cursor.
        */
        if (editor.hasMultipleCursors()) {
          /*
          * Remove the cursor that is exactly at the position the mouse clicked
          * and not just the last added cursor.
          */
          let screenPos = atom.views.getView(editor).component.screenPositionForMouseEvent(e)
          let cursor = editor.getCursorAtScreenPosition(screenPos)
          if (cursor) cursor.destroy()
        }
        let linkRaw = element.innerText


        // check for softwrap
        let line = element.closest(".line")
        let gutterLines = paneContainer.activePane.getActiveEditor().element.querySelector(".line-numbers")

        // clicked link before it softwrapped
        let gutterLine = gutterLines.querySelector(`[data-screen-row="${parseInt(line.dataset.screenRow)+1}"]`)
        if (gutterLine && gutterLine.innerText.trim() == "•") {
          let linkPart = line.nextSibling.querySelector(".syntax--hyperlink")
          if (linkPart && !linkPart.innerText.trim().match(linkExp)) {
            linkRaw += linkPart.innerText.trim()
          }
        }

        // clicked link after it softwrapped
        gutterLine = gutterLines.querySelector(`[data-screen-row="${line.dataset.screenRow}"]`)
        if (gutterLine && gutterLine.innerText.trim() == "•" && !linkRaw.match(linkExp)) {
          let linkPart = Array.from(line.previousSibling.querySelectorAll(".syntax--hyperlink")).pop()
          if (linkPart) {
            linkRaw = `${linkPart.innerText.trim()}${element.innerText.trim()}`
          }
        }

        /*
        * In markdown links are not in an element with class hyperlink, they have to be parsed.
        * This also means that in markdown we can click anywhere in the link definition (also the title of the link)
        * to open it in a browser
        */
        if (isMarkdown && !isNormalHyperlink) {
          /*
          * We match only the url inside the parentheses
          */
          let exp = /^\((.*)\)$/
          let matches = exp.exec(linkRaw)
          if (matches && matches[1]) {
            linkRaw = matches[1]
          } else {
            /*
            * We could also be clicking on a url reference of the
            * form [name][refname]
            * Now linkRaw would be "[refname]" if this is the cases
            * we do not want to open anything
            */

            exp = /^(\[.*\])$/
            matches = exp.exec(linkRaw)
            if (matches && matches[1]) return
          }

          /*
          * If the url could not be matched, we clicked on a link
          * definition of the form [name]: url and only "url" was
          * matched, so we don't need to do anything
          */
        }

        let link = decodeURI(linkRaw)
        console.log("Opening " + link + " in browser!")
        shell.openExternal(link)
      }
    }
  })
}


module.exports = {
  activate
}
