use crate::db_context::DbContext;
use crate::error::Result;
use crate::models::{WebsocketConnection, WebsocketConnectionIden, WebsocketConnectionState};
use crate::queries::MAX_HISTORY_ITEMS;
use crate::util::UpdateSource;
use log::debug;
use sea_query::{Expr, Query, SqliteQueryBuilder};
use sea_query_rusqlite::RusqliteBinder;

impl<'a> DbContext<'a> {
    pub fn get_websocket_connection(&self, id: &str) -> Result<WebsocketConnection> {
        self.find_one(WebsocketConnectionIden::Id, id)
    }

    pub fn delete_all_websocket_connections_for_request(
        &self,
        request_id: &str,
        source: &UpdateSource,
    ) -> Result<()> {
        let responses = self.list_websocket_connections_for_request(request_id)?;
        for m in responses {
            self.delete(&m, source)?;
        }
        Ok(())
    }

    pub fn delete_all_websocket_connections_for_workspace(
        &self,
        workspace_id: &str,
        source: &UpdateSource,
    ) -> Result<()> {
        let responses = self.list_websocket_connections(workspace_id)?;
        for m in responses {
            self.delete(&m, source)?;
        }
        Ok(())
    }

    pub fn list_websocket_connections(
        &self,
        workspace_id: &str,
    ) -> Result<Vec<WebsocketConnection>> {
        self.find_many(WebsocketConnectionIden::WorkspaceId, workspace_id, None)
    }

    pub fn list_websocket_connections_for_request(
        &self,
        request_id: &str,
    ) -> Result<Vec<WebsocketConnection>> {
        self.find_many(WebsocketConnectionIden::RequestId, request_id, None)
    }

    pub fn delete_websocket_connection(
        &self,
        websocket_connection: &WebsocketConnection,
        source: &UpdateSource,
    ) -> Result<WebsocketConnection> {
        self.delete(websocket_connection, source)
    }

    pub fn delete_websocket_connection_by_id(
        &self,
        id: &str,
        source: &UpdateSource,
    ) -> Result<WebsocketConnection> {
        let websocket_connection = self.get_websocket_connection(id)?;
        self.delete_websocket_connection(&websocket_connection, source)
    }

    pub fn upsert_websocket_connection(
        &self,
        websocket_connection: &WebsocketConnection,
        source: &UpdateSource,
    ) -> Result<WebsocketConnection> {
        let connections =
            self.list_websocket_connections_for_request(&websocket_connection.request_id)?;

        for m in connections.iter().skip(MAX_HISTORY_ITEMS - 1) {
            debug!("Deleting old websocket connection {}", websocket_connection.id);
            self.delete_websocket_connection(&m, source)?;
        }

        self.upsert(websocket_connection, source)
    }

    pub fn cancel_pending_websocket_connections(&self) -> Result<()> {
        let closed = serde_json::to_value(&WebsocketConnectionState::Closed)?;
        let (sql, params) = Query::update()
            .table(WebsocketConnectionIden::Table)
            .values([(WebsocketConnectionIden::State, closed.as_str().into())])
            .cond_where(Expr::col(WebsocketConnectionIden::State).ne(closed.as_str()))
            .build_rusqlite(SqliteQueryBuilder);
        let mut stmt = self.conn.prepare(sql.as_str())?;
        stmt.execute(&*params.as_params())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::init_in_memory;
    use crate::models::{WebsocketRequest, Workspace};

    #[test]
    fn cancel_pending_websocket_connections_closes_non_closed_connections() {
        let (query_manager, _blob_manager, _rx) = init_in_memory().expect("Failed to init DB");
        let db = query_manager.connect();
        db.upsert_workspace(
            &Workspace { id: "wk_test".to_string(), ..Default::default() },
            &UpdateSource::Sync,
        )
        .expect("Failed to seed workspace");
        db.upsert_websocket_request(
            &WebsocketRequest {
                id: "rq_test".to_string(),
                workspace_id: "wk_test".to_string(),
                ..Default::default()
            },
            &UpdateSource::Sync,
        )
        .expect("Failed to seed WebSocket request");

        let connected = db
            .upsert_websocket_connection(
                &WebsocketConnection {
                    id: "wsc_connected".to_string(),
                    workspace_id: "wk_test".to_string(),
                    request_id: "rq_test".to_string(),
                    state: WebsocketConnectionState::Connected,
                    ..Default::default()
                },
                &UpdateSource::Sync,
            )
            .expect("Failed to seed connected WebSocket connection");
        let closed = db
            .upsert_websocket_connection(
                &WebsocketConnection {
                    id: "wsc_closed".to_string(),
                    workspace_id: "wk_test".to_string(),
                    request_id: "rq_test".to_string(),
                    state: WebsocketConnectionState::Closed,
                    ..Default::default()
                },
                &UpdateSource::Sync,
            )
            .expect("Failed to seed closed WebSocket connection");

        db.cancel_pending_websocket_connections()
            .expect("Failed to cancel pending WebSocket connections");

        assert!(matches!(
            db.get_websocket_connection(&connected.id).unwrap().state,
            WebsocketConnectionState::Closed
        ));
        assert!(matches!(
            db.get_websocket_connection(&closed.id).unwrap().state,
            WebsocketConnectionState::Closed
        ));
    }
}
