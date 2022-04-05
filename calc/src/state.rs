use std::{any::type_name};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Storage, ReadonlyStorage, StdResult, StdError, Uint128};
use serde::de::DeserializeOwned;
use secret_toolkit::serialization::{Bincode2, Serde};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct EquationVariables {
    pub x: Uint128,
    pub y: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct UserCalculation {
    pub eq: EquationVariables,
    pub op: String,
    pub res: String,
    pub timestamp: u64,
}

pub fn save_eq<S: Storage>(mut storage: &mut S, key: &[u8], value: UserCalculation) -> StdResult<()> {
    let result: Option<Vec<UserCalculation>> = may_load(&*storage, key).ok().unwrap();
    match result {
        Some(stored_vec) => {
            let mut new_vec = stored_vec;
            new_vec.push(value);
            storage.set(key, &Bincode2::serialize(&new_vec)?);
        }
        None => {
            let mut new_vec = Vec::new();
            new_vec.push(value);
            storage.set(key, &Bincode2::serialize(&new_vec)?);
        }
    }
    Ok(())
}

pub fn load<T: DeserializeOwned, S: ReadonlyStorage>(storage: &S, key: &[u8]) -> StdResult<T> {
    Bincode2::deserialize(
        &storage
            .get(key)
            .ok_or_else(|| StdError::not_found(type_name::<T>()))?,
    )
}

pub fn may_load<T: DeserializeOwned, S: ReadonlyStorage>(storage: &S, key: &[u8]) -> StdResult<Option<T>> {
    match storage.get(key) {
        Some(value) => Bincode2::deserialize(&value).map(Some),
        None => Ok(None),
    }
}