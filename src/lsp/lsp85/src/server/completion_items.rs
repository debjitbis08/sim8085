use lsp_types::{CompletionItem, CompletionItemKind, Documentation, MarkupContent, MarkupKind};
use crate::server::utils::{get_documentation};

pub fn get_completion_items() -> Vec<CompletionItem> {
    let registers = ["A", "B", "C", "D", "E", "H", "L", "M", "SP", "PSW"];

    get_documentation()
        .into_iter()
        .map(|info| {
            let kind = if registers.contains(&info.label) {
                CompletionItemKind::VALUE
            } else {
                CompletionItemKind::KEYWORD
            };

            CompletionItem {
                label: info.label.to_string(),
                detail: Some(info.detail.to_string()),
                documentation: Some(Documentation::MarkupContent(MarkupContent {
                    kind: MarkupKind::Markdown,
                    value: info.documentation.to_string(),
                })),
                kind: Some(kind),
                ..Default::default()
            }
        })
        .collect()
}
