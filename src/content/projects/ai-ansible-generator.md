---
problem: >-
  Large language models can write Ansible, but raw model output can't be trusted
  in production: it may not be valid YAML, may not pass Ansible's own syntax
  checks, and may do something destructive. Pasting it into a terminal is how
  outages start.
approach:
  - "Treat the model as an untrusted author: everything it writes goes through validation before anyone sees it as a result."
  - "Validate in layers: YAML parsing, Ansible syntax, then safety rules for risky patterns."
  - "When validation fails, feed the errors back to the model in a repair loop instead of handing the user a broken playbook."
  - "Keep the model pluggable: run locally with Ollama or use hosted models through Hugging Face."
  - "Serve it two ways: a FastAPI backend for programmatic use and a Gradio interface for people."
outcome:
  - "Plain-English requests become Ansible playbooks that have passed YAML, syntax and safety validation."
  - "A live demo runs on Hugging Face Spaces."
diagram:
  title: AI Ansible Generator — generate, validate, repair
  stages:
    - label: request
      nodes:
        - id: prompt
          label: plain-English request
          caption: gradio ui · fastapi
          kind: trigger
          detail: A person describes the automation they want in plain English through the Gradio interface, or a client calls the FastAPI backend.
    - label: generate
      nodes:
        - id: llm
          label: LLM
          caption: ollama · hugging face
          kind: external
          detail: The request is turned into a draft playbook by a local model through Ollama or a hosted model through Hugging Face. Either way, the draft is treated as untrusted.
    - label: validate
      nodes:
        - id: yaml
          label: YAML check
          caption: parse
          kind: check
          detail: The draft must parse as YAML before anything else happens.
        - id: syntax
          label: syntax check
          caption: ansible
          kind: check
          detail: The playbook must pass Ansible syntax validation.
        - id: safety
          label: safety rules
          caption: risky patterns
          kind: check
          detail: Safety checks flag dangerous operations before the playbook is returned.
    - label: repair
      nodes:
        - id: repair
          label: repair loop
          caption: errors → model
          kind: process
          detail: If any check fails, the validation errors go back to the model with the draft so it can fix them, and the result is validated again.
    - label: result
      nodes:
        - id: output
          label: validated playbook
          caption: ui · api response
          kind: output
          detail: Only a playbook that passed every check is returned to the user or API client.
---
