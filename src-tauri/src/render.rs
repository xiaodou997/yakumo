pub use yakumo::render::render_grpc_request;
use yakumo_models::models::Environment;
use yakumo_models::render::make_vars_hashmap;
use yakumo_templates::{RenderOptions, TemplateCallback, parse_and_render};

pub async fn render_template<T: TemplateCallback>(
    template: &str,
    environment_chain: Vec<Environment>,
    cb: &T,
    opt: &RenderOptions,
) -> yakumo_templates::error::Result<String> {
    let vars = &make_vars_hashmap(environment_chain);
    parse_and_render(template, vars, cb, &opt).await
}
