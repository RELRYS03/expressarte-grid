(() => {
  const dialog = document.createElement('dialog')
  dialog.setAttribute('aria-labelledby', 'feedback-title')
  dialog.innerHTML = `
    <form>
      <h2 id="feedback-title"></h2>
      <p>Saved in this browser.</p>
      <label class="f">Your message
        <textarea name="message" rows="5" maxlength="2000" required></textarea>
      </label>
      <div class="row">
        <button type="button" data-close>Cancel</button>
        <button type="submit" class="primary">Save feedback</button>
      </div>
      <p role="status"></p>
    </form>`
  dialog.style.cssText = 'width:min(92vw,440px);border:1px solid #c9d3e3;border-radius:12px;padding:20px'
  document.body.append(dialog)
  const form = dialog.querySelector('form')
  const input = form.elements.message
  const status = dialog.querySelector('[role=status]')
  let kind

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-feedback]')
    if (!trigger) return
    kind = trigger.dataset.feedback
    dialog.querySelector('h2').textContent = kind === 'idea' ? 'Suggest a generator' : 'Send feedback'
    form.reset()
    status.textContent = ''
    dialog.showModal()
  })
  dialog.querySelector('[data-close]').onclick = () => dialog.close()
  input.oninput = () => input.setCustomValidity('')
  form.addEventListener('submit', event => {
    event.preventDefault()
    const message = input.value.trim()
    if (!message) {
      input.setCustomValidity('Enter a message.')
      input.reportValidity()
      return
    }
    try {
      const key = 'gigaprint.local.feedback'
      const drafts = JSON.parse(localStorage.getItem(key) || '[]')
      localStorage.setItem(key, JSON.stringify([...drafts, { kind, message, time: new Date().toISOString() }]))
      form.reset()
      status.textContent = 'Feedback saved on this device.'
    } catch {
      status.textContent = 'Could not save feedback on this device.'
    }
  })
})()
